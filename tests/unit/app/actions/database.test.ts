import { beforeEach, describe, expect, it, vi } from "vitest"

const session = vi.fn()
const backup = vi.fn()
const apply = vi.fn()
const presign = vi.fn()
const storage = { on: true }

vi.mock("@/auth", () => ({ auth: { api: { getSession: () => session() } } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => true }))
vi.mock("@/platform/database/backup", () => ({ createBackup: (...a: unknown[]) => backup(...a) }))
vi.mock("@/platform/database/migrate", () => ({ applyMigrations: (...a: unknown[]) => apply(...a) }))
vi.mock("@/platform/storage/r2", () => ({
  storageConfigured: () => storage.on,
  presignDownload: (...a: unknown[]) => presign(...a),
}))

const { applyDatabaseMigrations, backUpDatabase, backupDownloadUrl } = await import("@/app/actions/database")
const as = (role: string) => session.mockResolvedValue({ user: { id: `${role}-1`, role } })

beforeEach(() => {
  for (const f of [session, backup, apply, presign]) f.mockReset()
  storage.on = true
  backup.mockResolvedValue({ key: "platform-backups/2026-10-27T00-00-00Z.sql.gz", size: 10, rows: 1, tables: 1 })
  vi.spyOn(console, "info").mockImplementation(() => {})
})

describe("database actions", () => {
  it("are ROOT only, ADMIN included in the refusal", async () => {
    as("ADMIN")
    await expect(backUpDatabase()).rejects.toThrow("Unauthorized")
    await expect(applyDatabaseMigrations("MIGRATE")).rejects.toThrow("Unauthorized")
    await expect(backupDownloadUrl("platform-backups/2026-10-27T00-00-00Z.sql.gz")).rejects.toThrow("Unauthorized")
    expect(backup).not.toHaveBeenCalled()
    expect(apply).not.toHaveBeenCalled()
  })

  it("backs up with the caller's id, and says so when storage is off", async () => {
    as("ROOT")
    await expect(backUpDatabase()).resolves.toEqual({})
    expect(backup).toHaveBeenCalledWith("ROOT-1")

    storage.on = false
    await expect(backUpDatabase()).resolves.toEqual({ error: "noStorage" })
  })

  it("checks the typed confirmation on the server", async () => {
    as("ROOT")
    await expect(applyDatabaseMigrations("migrate")).resolves.toEqual({ error: "confirm" })
    expect(apply).not.toHaveBeenCalled()

    apply.mockResolvedValue({ ok: true, applied: ["m1"], backupKey: "k" })
    await expect(applyDatabaseMigrations("MIGRATE")).resolves.toEqual({ applied: ["m1"], backedUp: true })
  })

  it("turns a refusal into its message", async () => {
    as("ROOT")
    apply.mockResolvedValue({ ok: false, reason: "locked" })
    await expect(applyDatabaseMigrations("MIGRATE")).resolves.toEqual({ error: "locked" })
  })

  it("signs a link only for a backup key, never for anything else in the bucket", async () => {
    as("ROOT")
    presign.mockResolvedValue("https://signed")
    await expect(backupDownloadUrl("platform-backups/2026-10-27T00-00-00Z.sql.gz")).resolves.toEqual({
      url: "https://signed",
    })
    await expect(backupDownloadUrl("media/t1/secret.png")).resolves.toEqual({ error: "notFound" })
    await expect(backupDownloadUrl({ key: "x" })).resolves.toEqual({ error: "notFound" })
    expect(presign).toHaveBeenCalledTimes(1)
  })
})
