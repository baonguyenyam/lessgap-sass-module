import { describe, expect, it, vi } from "vitest"
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" }

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { scopeCollection } = await import("@/platform/tenancy/tenant-db")
const { modelsWithRls } = await import("@/platform/tenancy/rls")
const { MODEL_CLASSIFICATION } = await import("@/platform/tenancy/models")

/** A stand-in collection that records its chain and the data it was handed. */
function fakeCollection(chain: unknown[] = [], calls: unknown[][] = []) {
  const make = (c: unknown[]): Record<string, unknown> => ({
    where: (filter: unknown) => make([...c, ["where", filter]]),
    orderBy: (order: unknown) => make([...c, ["orderBy", order]]),
    all: async () => calls.push(["all", c]),
    create: async (data: unknown) => calls.push(["create", c, data]),
    createAll: async (data: unknown) => calls.push(["createAll", c, data]),
    update: async (data: unknown) => calls.push(["update", c, data]),
    upsert: async (options: unknown) => calls.push(["upsert", c, options]),
  })
  return { collection: make(chain), calls }
}

describe("scopeCollection (T4)", () => {
  it("narrows every read, including after further chaining", async () => {
    const { collection, calls } = fakeCollection()
    const scoped = scopeCollection(collection, "t1") as Record<string, (...a: unknown[]) => unknown>
    await (scoped.where({ key: "x" }) as typeof scoped).all()
    expect(calls[0]).toEqual([
      "all",
      [
        ["where", { tenantId: "t1" }],
        ["where", { key: "x" }],
      ],
    ])
  })

  it("gives creates the tenant id and refuses another tenant's", async () => {
    const { collection, calls } = fakeCollection()
    const scoped = scopeCollection(collection, "t1") as Record<string, (...a: unknown[]) => Promise<unknown>>
    await scoped.create({ key: "a" })
    await scoped.createAll([{ key: "b" }, { key: "c", tenantId: "t1" }])
    expect(calls[0][2]).toEqual({ key: "a", tenantId: "t1" })
    expect(calls[1][2]).toEqual([
      { key: "b", tenantId: "t1" },
      { key: "c", tenantId: "t1" },
    ])
    expect(() => scoped.create({ key: "x", tenantId: "t2" })).toThrow()
  })

  it("refuses an update or upsert that would move a row to another tenant", async () => {
    const { collection } = fakeCollection()
    const scoped = scopeCollection(collection, "t1") as Record<string, (...a: unknown[]) => Promise<unknown>>
    expect(() => scoped.update({ tenantId: "t2" })).toThrow()
    expect(() => scoped.upsert({ create: { key: "a" }, update: { tenantId: "t2" } })).toThrow()
  })
})

// Exceptions are tenant-owned tables still shared with platform-level rows;
// each has a Finding in spec/phases/phase-1.md and leaves this list when fixed.
const RLS_PENDING: Record<string, string> = {}

describe("row-level security on tenant-owned tables (M3)", () => {
  const tenantOwned = Object.entries(MODEL_CLASSIFICATION)
    .filter(([, c]) => c.kind === "tenant-owned")
    .map(([model]) => model)

  it.each(tenantOwned)("%s has RLS in the contract, or a recorded reason it does not yet", (model) => {
    expect(modelsWithRls(contractJson).includes(model) || model in RLS_PENDING).toBe(true)
  })

  it("keeps the pending list honest: nothing in it already has RLS", () => {
    for (const model of Object.keys(RLS_PENDING)) expect(modelsWithRls(contractJson)).not.toContain(model)
  })
})
