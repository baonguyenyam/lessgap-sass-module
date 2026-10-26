import { describe, it, expect, vi } from "vitest"
import type { MigrationEdge } from "@/lib/migration-chain"

// The module builds its own status from the real contract at import time; the
// tests only need the pure parts, so the database client is never touched.
vi.mock("@/lib/db8", () => ({ contract: { storage: { storageHash: "h3" } }, db8: {} }))

const { createSchemaStatus, isUndefinedTable } = await import("@/lib/schema-status")

const EDGES: MigrationEdge[] = [
  { name: "20260101T0000_kit_baseline", from: null, to: "h1" },
  { name: "20260201T0000_second", from: "h1", to: "h2" },
  { name: "20260301T0000_third", from: "h2", to: "h3" },
]

describe("createSchemaStatus", () => {
  it("is aligned when the marker is the contract", async () => {
    const status = createSchemaStatus(EDGES, "h3", async () => "h3")
    expect(await status()).toEqual({ aligned: true, pending: 0 })
  })

  it("counts the migrations between the marker and the contract", async () => {
    const status = createSchemaStatus(EDGES, "h3", async () => "h1")
    expect(await status()).toEqual({ aligned: false, pending: 2 })
  })

  it("treats a database that was never migrated as missing all of them", async () => {
    const status = createSchemaStatus(EDGES, "h3", async () => null)
    expect(await status()).toEqual({ aligned: false, pending: 3 })
  })

  it("says behind with an unknown count when the marker is on no path to the contract", async () => {
    const status = createSchemaStatus(EDGES, "h3", async () => "changed-by-hand")
    expect(await status()).toEqual({ aligned: false, pending: null })
  })

  it("says unknown, not behind, when the database cannot be asked", async () => {
    const status = createSchemaStatus(EDGES, "h3", async () => {
      throw new Error("connect ECONNREFUSED")
    })
    expect(await status()).toEqual({ aligned: null, pending: null })
  })

  // A health endpoint that waits on a database that never answers is a health
  // endpoint that never answers.
  it("says unknown when the database does not answer in time", async () => {
    const status = createSchemaStatus(EDGES, "h3", () => new Promise(() => {}), 20)
    expect(await status()).toEqual({ aligned: null, pending: null })
  })

  /**
   * Aligned is remembered, behind is not. What happens after a failed check is
   * somebody applying the migration and checking again: an instance that kept
   * its old answer would fail a database that is now fine.
   */
  it("remembers aligned, and asks again after behind", async () => {
    const read = vi.fn<() => Promise<string | null>>().mockResolvedValueOnce("h1").mockResolvedValue("h3")
    const status = createSchemaStatus(EDGES, "h3", read)

    expect((await status()).aligned).toBe(false)
    expect((await status()).aligned).toBe(true)
    expect((await status()).aligned).toBe(true)
    expect(read).toHaveBeenCalledTimes(2)
  })
})

describe("isUndefinedTable", () => {
  it("recognises a missing marker table however the driver reports it", () => {
    expect(isUndefinedTable({ code: "42P01" })).toBe(true)
    expect(isUndefinedTable({ code: "3F000" })).toBe(true)
    expect(isUndefinedTable(new Error('relation "prisma_contract.marker" does not exist'))).toBe(true)
    expect(isUndefinedTable({ name: "RuntimeError", cause: { code: "42P01" } })).toBe(true)
  })

  // A missing column is a different failure: it must not read as "never
  // migrated", which would report every migration as missing.
  it("does not mistake another failure for it", () => {
    expect(isUndefinedTable(new Error("connect ECONNREFUSED"))).toBe(false)
    expect(isUndefinedTable({ code: "42703", message: 'column "x" does not exist' })).toBe(false)
  })
})
