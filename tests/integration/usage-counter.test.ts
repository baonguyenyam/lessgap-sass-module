import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { nowTs, toTs } from "@/lib/timestamps"
import { AppError } from "@/platform/errors"
import { consumeLimit } from "@/platform/entitlements/usage"
import { resetDatabase, activateTenant } from "@tests/helpers/db"

// Task 2.3, roadmap exit criterion: concurrent consumeLimit calls on the same
// period bucket never take the total past the limit — the conditional UPDATE
// is the guarantee, not application ordering.
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

async function tenantWithLimit(limit: number) {
  const { Plan, Subscription } = db8.orm.public
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `cap-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "Cap",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "Capped", slug: `cap-${Date.now()}`, userId: user.id },
  })
  await activateTenant(tenant.id)
  const plan = await Plan.create({
    name: "Cap Plan",
    slug: `plan-${Date.now()}`,
    price: 100,
    interval: "MONTH",
    features: { "newsletter.exports.monthly": limit },
  })
  await Subscription.create({
    tenantId: tenant.id,
    planId: plan.id,
    stripeSubscriptionId: `sub_${Date.now()}`,
    status: "ACTIVE",
    currentPeriodStart: nowTs(),
    currentPeriodEnd: toTs(new Date(2100, 0, 1)),
  })
  return tenant.id
}

describe("consumeLimit", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("concurrent callers never exceed the limit", async () => {
    const tenantId = await tenantWithLimit(5)
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => consumeLimit({ tenantId }, "newsletter.exports.monthly", 1))
    )
    const taken = results.filter((r) => r.status === "fulfilled").length
    const refused = results.filter(
      (r) => r.status === "rejected" && (r.reason as AppError).code === "limit_reached"
    ).length
    expect(taken).toBe(5)
    expect(refused).toBe(5)

    const row = await db8.orm.public.UsageCounter.where({ tenantId }).first()
    expect(row?.used).toBe(5)
  })

  it("an over-limit refusal leaves the counter untouched", async () => {
    const tenantId = await tenantWithLimit(2)
    await consumeLimit({ tenantId }, "newsletter.exports.monthly", 2)
    await expect(consumeLimit({ tenantId }, "newsletter.exports.monthly", 1)).rejects.toMatchObject({
      code: "limit_reached",
    })
    const row = await db8.orm.public.UsageCounter.where({ tenantId }).first()
    expect(row?.used).toBe(2)
  })
})
