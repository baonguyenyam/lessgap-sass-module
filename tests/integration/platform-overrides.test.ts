import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { getEntitlements } from "@/platform/entitlements"
import { resetDatabase } from "@tests/helpers/db"

// Task 2.6: an override visibly flips a tenant's ent.has, names staff and
// reason in the audit row, and an expired override stops applying without
// anyone deleting it.
vi.mock("@/platform/staff", () => ({
  requirePlatformRole: async () => ({ user: { id: "staff-1" }, platformRole: "ADMIN" }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

describe("tenant overrides", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("an override flips ent.has, is audited, and expires on its own", async () => {
    const { EntitlementOverride, AuditLog } = db8.orm.public
    const { user } = await auth.api.signUpEmail({
      body: { email: `ov-${Date.now()}@example.test`, password: "correct horse battery staple", name: "OV" },
    })
    const tenant = await auth.api.createOrganization({
      body: { name: "Overridden", slug: `ov-${Date.now()}`, userId: user.id },
    })

    expect((await getEntitlements({ tenantId: tenant.id })).has("roles.custom")).toBe(true)

    const { setEntitlementOverride, revokeEntitlementOverride } = await import("@/app/actions/platform-overrides")
    await expect(
      setEntitlementOverride(tenant.id, "roles.custom", false, "test revocation", null, false)
    ).resolves.toEqual({})
    expect((await getEntitlements({ tenantId: tenant.id })).has("roles.custom")).toBe(false)

    const audit = await AuditLog.where({ action: "platform.override.upserted", targetId: "roles.custom" }).first()
    expect(audit).toMatchObject({ actorId: "staff-1", tenantId: tenant.id })

    // Expire it directly — an expired row stops applying without a delete.
    const row = await EntitlementOverride.where({ tenantId: tenant.id }).first()
    await EntitlementOverride.where({ id: row!.id }).update({ expiresAt: toTs(new Date(2000, 0, 1)) })
    expect((await getEntitlements({ tenantId: tenant.id })).has("roles.custom")).toBe(true)

    // Revoke deletes the row and audits it.
    await EntitlementOverride.where({ id: row!.id }).update({ expiresAt: null })
    await expect(revokeEntitlementOverride(row!.id)).resolves.toEqual({})
    expect(await EntitlementOverride.where({ id: row!.id }).first()).toBeNull()
    expect(
      await AuditLog.where({ action: "platform.override.revoked", targetId: "roles.custom" }).first()
    ).not.toBeNull()
  })
})
