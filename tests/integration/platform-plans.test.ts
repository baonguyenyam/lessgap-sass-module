import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { nowTs, toTs } from "@/lib/timestamps"
import { getEntitlements } from "@/platform/entitlements"
import { resetDatabase, activateTenant } from "@tests/helpers/db"

// Task 2.5: an edited plan changes what its tenants resolve on their next
// read — no cache of the old map survives, and the save knows how many
// tenants it touches.
vi.mock("@/platform/staff", () => ({
  requirePlatformRole: async () => ({ user: { id: "staff-1" }, platformRole: "ADMIN" }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

describe("platform plans", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("an edited plan flips a subscribed tenant's resolved entitlement", async () => {
    const { Plan, Subscription, AuditLog } = db8.orm.public
    const { user } = await auth.api.signUpEmail({
      body: { email: `pp-${Date.now()}@example.test`, password: "correct horse battery staple", name: "PP" },
    })
    const tenant = await auth.api.createOrganization({
      body: { name: "Planned", slug: `pp-${Date.now()}`, userId: user.id },
    })
    await activateTenant(tenant.id)
    const plan = await Plan.create({
      name: "Cap Plan",
      slug: `cap-${Date.now()}`,
      price: 100,
      interval: "MONTH",
      features: { "roles.max": 5 },
    })
    await Subscription.create({
      tenantId: tenant.id,
      planId: plan.id,
      stripeSubscriptionId: `sub_${Date.now()}`,
      status: "ACTIVE",
      currentPeriodStart: nowTs(),
      currentPeriodEnd: toTs(new Date(2100, 0, 1)),
    })

    expect((await getEntitlements({ tenantId: tenant.id })).limit("roles.max")).toBe(5)

    const { updatePlan } = await import("@/app/actions/platform-plans")
    await expect(updatePlan(plan.id, { features: { "roles.max": 25 } })).resolves.toEqual({})
    expect((await getEntitlements({ tenantId: tenant.id })).limit("roles.max")).toBe(25)

    await expect(updatePlan(plan.id, { features: { "bogus.key": true } })).resolves.toEqual({
      error: expect.any(String),
    })
    // The refused save did not change what the tenant resolves.
    expect((await getEntitlements({ tenantId: tenant.id })).limit("roles.max")).toBe(25)

    expect(await AuditLog.where({ action: "platform.plan.updated", targetId: plan.id }).first()).not.toBeNull()
  })
})
