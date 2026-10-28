import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { getMembership, resolveTenantMember } from "@/platform/tenancy/require-member"
import { getEntitlements } from "@/platform/entitlements"
import { AppError } from "@/platform/errors"
import { resetDatabase } from "@tests/helpers/db"

// Task 2.8: the signup switches gate what a new tenant gets — a free plan when
// signup.free_plan.enabled, a PROVISIONING status staff must approve when
// signup.require_approval. resolveTenantMember treats PROVISIONING like any
// non-ACTIVE status: not found.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("@/platform/staff", () => ({
  requirePlatformRole: async () => ({ user: { id: "staff-1" }, platformRole: "ADMIN" }),
}))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

async function setSwitch(key: string, value: unknown) {
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key },
    create: { key, value: value as never, updatedById: "test" },
    update: { value: value as never, updatedById: "test" },
  })
}

async function provision(email = `sw-${Date.now()}-${Math.random()}@example.test`) {
  const { user } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: "Switch" },
  })
  const { ensureTenant } = await import("@/platform/tenancy/require-member")
  await ensureTenant({ id: user.id, email, name: "Switch" } as never)
  const member = await getMembership(user.id)
  const tenant = await db8.orm.public.Tenant.where({ id: member!.organizationId }).first()
  return { userId: user.id, tenantId: member!.organizationId, slug: tenant!.slug }
}

describe("signup switches", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("signup.free_plan.enabled assigns the free plan with no Stripe subscription", async () => {
    const { Plan, Subscription } = db8.orm.public
    await setSwitch("signup.free_plan.enabled", true)
    const plan = await Plan.create({
      name: "Free",
      slug: `free-${Date.now()}`,
      price: 0,
      interval: "MONTH",
      stripePriceId: null,
      features: { "roles.max": 2 },
    })
    const { tenantId } = await provision()

    const sub = await Subscription.where({ tenantId }).first()
    expect(sub).toMatchObject({ planId: plan.id, status: "ACTIVE", stripeSubscriptionId: null })
    expect((await getEntitlements({ tenantId })).limit("roles.max")).toBe(2)
  })

  it("signup.free_plan.enabled off assigns nothing", async () => {
    await setSwitch("signup.free_plan.enabled", false)
    const { tenantId } = await provision()
    expect(await db8.orm.public.Subscription.where({ tenantId }).first()).toBeNull()
  })

  it("signup.require_approval leaves the tenant PROVISIONING until staff activate it", async () => {
    const { Tenant } = db8.orm.public
    await setSwitch("signup.require_approval", true)
    const { userId, tenantId, slug } = await provision()

    expect((await Tenant.where({ id: tenantId }).first())?.status).toBe("PROVISIONING")
    await expect(resolveTenantMember(userId, slug)).rejects.toBeInstanceOf(AppError)

    // Staff approval is the console's own action.
    const { setTenantStatus } = await import("@/app/actions/platform-tenants")
    await expect(setTenantStatus(tenantId, "ACTIVE", "")).resolves.toEqual({})
    expect((await Tenant.where({ id: tenantId }).first())?.status).toBe("ACTIVE")
  })
})
