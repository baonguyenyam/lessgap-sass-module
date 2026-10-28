import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resolveTenantMember } from "@/platform/tenancy/require-member"
import { getEntitlements } from "@/platform/entitlements"
import { AppError } from "@/platform/errors"
import { toTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"

// Task 2.9: a past_due subscription starts the plan's grace period; the tenant
// keeps working until graceUntil, then suspends; a recovery reactivates.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

async function provisionPaid(graceDays = 2) {
  const { Plan, Subscription, Tenant } = db8.orm.public
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `pd-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "P",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "PaidCo", slug: `pd-${Date.now()}`, userId: user.id },
  })
  await Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  const plan = await Plan.create({
    name: "Pro",
    slug: `pro-${Date.now()}`,
    price: 1000,
    interval: "MONTH",
    gracePeriodDays: graceDays,
    features: { "roles.custom": true },
  })
  const sub = await Subscription.create({
    tenantId: tenant.id,
    planId: plan.id,
    stripeSubscriptionId: `sub_${Date.now()}`,
    status: "ACTIVE",
    currentPeriodStart: toTs(new Date()),
    currentPeriodEnd: toTs(new Date(Date.now() + 30 * 86400000)),
    cancelAtPeriodEnd: false,
  })
  return { userId: user.id, tenant, plan, sub, slug: tenant.slug }
}

describe("past_due grace period (task 2.9)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("the tenant keeps working until graceUntil, then suspends; recovery reactivates", async () => {
    const { Tenant } = db8.orm.public
    const { userId, tenant, plan, sub, slug } = await provisionPaid(2)

    // The webhook's past_due signal: mark the tenant the same way the handler does.
    const grace = new Date(Date.now() + plan.gracePeriodDays! * 86400000)
    await Tenant.where({ id: tenant.id }).update({ status: "PAST_DUE", graceUntil: toTs(grace) })
    await db8.orm.public.Subscription.where({ id: sub.id }).update({ status: "PAST_DUE" })

    // During grace: the member still resolves, and plan features still read.
    const ctx = await resolveTenantMember(userId, slug)
    expect(ctx.tenantId).toBe(tenant.id)
    expect((await getEntitlements({ tenantId: tenant.id })).has("roles.custom")).toBe(true)

    // Grace lapsed: the first access suspends the tenant and 404s.
    await Tenant.where({ id: tenant.id }).update({ graceUntil: toTs(new Date(Date.now() - 1000)) })
    await expect(resolveTenantMember(userId, slug)).rejects.toBeInstanceOf(AppError)
    expect((await Tenant.where({ id: tenant.id }).first())?.status).toBe("SUSPENDED")

    // Recovery: the subscription goes active again — staff (or the webhook's
    // `active` mapping) reactivates the tenant and clears the grace marker.
    await db8.orm.public.Subscription.where({ id: sub.id }).update({ status: "ACTIVE" })
    await Tenant.where({ id: tenant.id }).update({ status: "ACTIVE", graceUntil: null })
    const again = await resolveTenantMember(userId, slug)
    expect(again.tenantId).toBe(tenant.id)
  })

  it("a plan with no grace period suspends on the first access after past_due", async () => {
    const { Tenant } = db8.orm.public
    const { userId, tenant, slug } = await provisionPaid(0)
    await Tenant.where({ id: tenant.id }).update({ status: "PAST_DUE", graceUntil: toTs(new Date()) })
    await expect(resolveTenantMember(userId, slug)).rejects.toBeInstanceOf(AppError)
    expect((await Tenant.where({ id: tenant.id }).first())?.status).toBe("SUSPENDED")
  })
})
