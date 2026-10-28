import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const staff = { user: { id: "staff-1" }, platformRole: "ADMIN" }

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/staff", () => ({ requirePlatformRole: async () => staff }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { setEntitlementOverride, revokeEntitlementOverride } = await import("@/app/actions/platform-overrides")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => db.reset())

describe("setEntitlementOverride", () => {
  it("requires a reason and a declared feature, matching its value kind", async () => {
    await expect(setEntitlementOverride("t1", "nope.key", true, "why", null, false)).resolves.toEqual({
      error: expect.any(String),
    })
    await expect(setEntitlementOverride("t1", "roles.custom", "yes", "why", null, false)).resolves.toEqual({
      error: expect.any(String),
    })
    await expect(setEntitlementOverride("t1", "roles.custom", true, "  ", null, false)).resolves.toEqual({
      error: expect.any(String),
    })
    await expect(setEntitlementOverride("t1", "roles.max", -1, "why", null, false)).resolves.toEqual({
      error: expect.any(String),
    })
    expect(db.fn("EntitlementOverride.upsert")).not.toHaveBeenCalled()
  })

  it("upserts one row per tenant+feature with staff id and audits it", async () => {
    await expect(setEntitlementOverride("t1", "roles.max", 25, "negotiated", "2100-01-01", true)).resolves.toEqual({})
    expect(db.fn("EntitlementOverride.upsert")).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: "t1",
          featureKey: "roles.max",
          value: 25,
          reason: "negotiated",
          ignoresSwitch: true,
          createdById: "staff-1",
        }),
      })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform.override.upserted",
        targetType: "override",
        targetId: "roles.max",
        actorId: "staff-1",
      })
    )
  })

  it("honours ignoresSwitch and optional expiry", async () => {
    await expect(setEntitlementOverride("t1", "roles.custom", false, "beta", null, true)).resolves.toEqual({})
    expect(db.fn("EntitlementOverride.upsert")).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ ignoresSwitch: true, expiresAt: null }) })
    )
  })
})

describe("revokeEntitlementOverride", () => {
  it("deletes the row and audits the revocation", async () => {
    db.fn("EntitlementOverride.first").mockResolvedValue({ id: "o1", tenantId: "t1", featureKey: "roles.max" })
    await expect(revokeEntitlementOverride("o1")).resolves.toEqual({})
    expect(db.fn("EntitlementOverride.delete")).toHaveBeenCalled()
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.override.revoked", targetId: "roles.max" })
    )
  })

  it("refuses an override that does not exist", async () => {
    db.fn("EntitlementOverride.first").mockResolvedValue(null)
    await expect(revokeEntitlementOverride("o404")).resolves.toEqual({ error: expect.any(String) })
    expect(db.fn("EntitlementOverride.delete")).not.toHaveBeenCalled()
  })
})
