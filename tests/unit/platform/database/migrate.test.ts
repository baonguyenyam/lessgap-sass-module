import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" }
import { MIGRATIONS } from "@/generated/migrations"

// The refusals of applyMigrations, in order (spec/adr/0023): the lock, the
// state, the backup. Postgres, R2 and the Prisma runner are stand-ins here.
const target = (contractJson as { storage: { storageHash: string } }).storage.storageHash
// One migration short of the contract (the manifest is not in chain order).
const behind = MIGRATIONS.find((edge) => edge.to === target)!.from

const state = vi.hoisted(() => ({
  locked: true,
  marker: null as string | null,
  storage: true,
  backup: vi.fn(),
  migrate: vi.fn(),
  queries: [] as string[],
}))

vi.mock("@/lib/schema-status", () => ({ readMarkerFromDatabase: async () => state.marker }))
vi.mock("@/platform/storage/r2", () => ({ storageConfigured: () => state.storage }))
vi.mock("@/platform/database/backup", () => ({
  createBackup: (...a: unknown[]) => state.backup(...a),
  directClient: () => ({
    connect: async () => {},
    end: async () => {},
    query: async (text: string) => {
      state.queries.push(text)
      return { rows: [{ locked: state.locked }] }
    },
  }),
}))
vi.mock("@prisma/orm-postgres/control", () => ({
  createPostgresControlClient: () => ({ migrate: (...a: unknown[]) => state.migrate(...a), close: async () => {} }),
}))

const { applyMigrations } = await import("@/platform/database/migrate")

beforeEach(() => {
  Object.assign(state, { locked: true, marker: behind, storage: true, queries: [] })
  state.backup.mockReset().mockResolvedValue({ key: "platform-backups/x.sql.gz" })
  state.migrate.mockReset().mockResolvedValue({ ok: true, value: { applied: [{ dirName: "m1" }] } })
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => vi.unstubAllEnvs())

describe("applyMigrations", () => {
  it("refuses a second run while the lock is held, before anything else", async () => {
    state.locked = false
    expect(await applyMigrations("root")).toEqual({ ok: false, reason: "locked" })
    expect(state.backup).not.toHaveBeenCalled()
    expect(state.migrate).not.toHaveBeenCalled()
  })

  it("does nothing when the database is already current", async () => {
    state.marker = target
    expect(await applyMigrations("root")).toEqual({ ok: true, applied: [], backupKey: null })
    expect(state.backup).not.toHaveBeenCalled()
  })

  it("refuses a database whose state it cannot place", async () => {
    state.marker = "not-on-the-graph"
    expect(await applyMigrations("root")).toEqual({ ok: false, reason: "unknown-state" })
    expect(state.migrate).not.toHaveBeenCalled()
  })

  it("backs up first, then migrates, then releases the lock", async () => {
    expect(await applyMigrations("root")).toEqual({
      ok: true,
      applied: ["m1"],
      backupKey: "platform-backups/x.sql.gz",
    })
    expect(state.backup.mock.invocationCallOrder[0]).toBeLessThan(state.migrate.mock.invocationCallOrder[0])
    expect(state.queries.at(-1)).toContain("pg_advisory_unlock")
  })

  it("stops when the backup fails", async () => {
    state.backup.mockRejectedValue(new Error("R2 down"))
    expect(await applyMigrations("root")).toEqual({ ok: false, reason: "backup-failed" })
    expect(state.migrate).not.toHaveBeenCalled()
  })

  it("refuses in production without storage, and goes ahead elsewhere", async () => {
    state.storage = false
    vi.stubEnv("NODE_ENV", "production")
    expect(await applyMigrations("root")).toEqual({ ok: false, reason: "no-storage" })
    expect(state.migrate).not.toHaveBeenCalled()

    vi.stubEnv("NODE_ENV", "development")
    expect(await applyMigrations("root")).toMatchObject({ ok: true, backupKey: null })
  })

  it("reports the runner's error code", async () => {
    state.migrate.mockResolvedValue({ ok: false, failure: { code: "MIGRATION.HASH_MISMATCH" } })
    expect(await applyMigrations("root")).toEqual({
      ok: false,
      reason: "migrate-failed",
      code: "MIGRATION.HASH_MISMATCH",
    })
    expect(state.queries.at(-1)).toContain("pg_advisory_unlock")
  })
})
