import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { nowTs, toTs } from "@/lib/timestamps"
import { getEntitlements } from "@/platform/entitlements"
import { resetDatabase } from "@tests/helpers/db"

// Task 2.2: `getEntitlements` reads the real layers — a subscription's plan,
// the tenant's add-ons, unexpired staff overrides and the tenant's own
// settings — not just the platform switches of the phase-1 stand-in.
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

describe("getEntitlements (task 2.2)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("resolves plan, add-on, override and tenant setting from real rows", async () => {
    const { Plan, Subscription, AddOn, TenantAddOn, EntitlementOverride } = db8.orm.public
    const { user } = await auth.api.signUpEmail({
      body: { email: `ent-${Date.now()}@example.test`, password: "correct horse battery staple", name: "Ent" },
    })
    const tenant = await auth.api.createOrganization({
      body: { name: "Entitled", slug: `ent-${Date.now()}`, userId: user.id },
    })

    // Plan turns roles.custom off and raises roles.max; the add-on turns the
    // feature back on; an expired override falls through to the plan's value.
    // The tenant-setting and ignoresSwitch cases are in the unit matrix.
    const plan = await Plan.create({
      name: "Ent Plan",
      slug: `plan-${Date.now()}`,
      price: 100,
      interval: "MONTH",
      features: { "roles.custom": false, "roles.max": 25 },
    })
    const addOn = await AddOn.create({
      key: `ao-${Date.now()}`,
      name: "Roles Plus",
      stripePriceId: `price_${Date.now()}`,
      features: { "roles.custom": true },
    })
    await Promise.all([
      Subscription.create({
        tenantId: tenant.id,
        planId: plan.id,
        stripeSubscriptionId: `sub_${Date.now()}`,
        status: "ACTIVE",
        currentPeriodStart: nowTs(),
        currentPeriodEnd: toTs(new Date(2100, 0, 1)),
      }),
      TenantAddOn.create({ tenantId: tenant.id, addOnId: addOn.id }),
      EntitlementOverride.create({
        tenantId: tenant.id,
        featureKey: "roles.max",
        value: 99,
        reason: "negotiated",
        createdById: "staff-1",
        expiresAt: toTs(new Date(2000, 0, 1)),
      }),
    ])

    const ent = await getEntitlements({ tenantId: tenant.id })
    // The add-on (layer 3) re-enables what the plan (layer 2) excluded.
    expect(ent.has("roles.custom")).toBe(true)
    // The override is expired → the plan's 25 stands.
    expect(ent.limit("roles.max")).toBe(25)
  })

  it("an unexpired override wins and the tenant's own setting can only remove", async () => {
    const { EntitlementOverride, TenantSetting } = db8.orm.public
    const { user } = await auth.api.signUpEmail({
      body: { email: `ent2-${Date.now()}@example.test`, password: "correct horse battery staple", name: "Ent2" },
    })
    const tenant = await auth.api.createOrganization({
      body: { name: "Overridden", slug: `ent2-${Date.now()}`, userId: user.id },
    })

    await Promise.all([
      EntitlementOverride.create({
        tenantId: tenant.id,
        featureKey: "roles.custom",
        value: false,
        reason: "revoked",
        createdById: "staff-1",
      }),
      TenantSetting.create({ tenantId: tenant.id, key: "feature.roles.max", value: false }),
    ])
    const overridden = await getEntitlements({ tenantId: tenant.id })
    expect(overridden.has("roles.custom")).toBe(false)
    expect(overridden.limit("roles.max")).toBe(0)
  })
})
