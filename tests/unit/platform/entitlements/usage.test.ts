import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppError } from "@/platform/errors"
import type { LimitFeature } from "@/platform/entitlements/registry"

// consumeLimit's two dependencies are the resolver (what the limit is) and the
// raw SQL it writes. Both are mocked so the unit tests cover the branches;
// the integration test covers the concurrency guarantee itself.
const ent = { has: vi.fn(), limit: vi.fn() }
const execute = vi.fn(async () => ({ affectedRows: 1 }))
const rawSql = vi.fn(() => ({ affectedCount: () => ({ build: () => "plan" }) }))

vi.mock("@/lib/db8", () => ({
  db8: {
    execute,
    raw: { sql: rawSql },
    transaction: async (fn: (tx: unknown) => unknown) => fn({ execute, raw: { sql: rawSql } }),
  },
}))
vi.mock("@/platform/entitlements/index", () => ({ getEntitlements: async () => ent, requireFeature: vi.fn() }))

const { consumeLimit } = await import("@/platform/entitlements/usage")
const KEY = "newsletter.exports.monthly" as LimitFeature
const ctx = { tenantId: "t1" }

beforeEach(() => {
  vi.clearAllMocks()
  execute.mockResolvedValue({ affectedRows: 1 })
})

describe("consumeLimit", () => {
  it("does nothing on an unlimited (null) limit and writes no row", async () => {
    ent.limit.mockReturnValue(null)
    await expect(consumeLimit(ctx, KEY, 1)).resolves.toBeUndefined()
    expect(execute).not.toHaveBeenCalled()
  })

  it("throws limit_reached when the limit is 0 or n exceeds it", async () => {
    ent.limit.mockReturnValue(0)
    await expect(consumeLimit(ctx, KEY, 1)).rejects.toBeInstanceOf(AppError)
    ent.limit.mockReturnValue(3)
    await expect(consumeLimit(ctx, KEY, 4)).rejects.toMatchObject({ code: "limit_reached" })
    expect(execute).not.toHaveBeenCalled()
  })

  it("throws limit_reached when the conditional update takes nothing", async () => {
    ent.limit.mockReturnValue(3)
    execute.mockResolvedValue({ affectedRows: 0 })
    await expect(consumeLimit(ctx, KEY, 1)).rejects.toMatchObject({ code: "limit_reached" })
  })

  it("takes the unit and uses the caller's transaction when given one", async () => {
    ent.limit.mockReturnValue(3)
    await expect(consumeLimit(ctx, KEY, 2)).resolves.toBeUndefined()
    expect(rawSql).toHaveBeenCalled()
    const tx = { execute, raw: { sql: rawSql } } as never
    await consumeLimit(ctx, KEY, 1, tx)
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it("refuses a limit that is not metered", async () => {
    await expect(consumeLimit(ctx, "roles.max" as LimitFeature, 1)).rejects.toMatchObject({ code: "internal" })
    expect(execute).not.toHaveBeenCalled()
  })
})
