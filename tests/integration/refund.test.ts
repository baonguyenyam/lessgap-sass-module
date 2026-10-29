import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers({ host: "site.test" }) }
})
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})
vi.mock("@/lib/stripe", () => ({
  stripe: {
    refunds: {
      create: vi.fn(async () => ({
        id: "re_1",
        status: "succeeded",
      })),
    },
  },
}))

const { refundPayment } = await import("@/app/actions/payments")
const { requireTenantContext } = await import("@/platform/tenancy/require-member")
const { stripe } = await import("@/lib/stripe")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `rf-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "R",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "RefundCo", slug: `rf-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({
    status: "ACTIVE",
    chargesEnabled: true,
    stripeAccountId: `acct_${tenant.id.slice(-8)}`,
  })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "payments", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.payments" },
    create: { key: "module.payments", value: true, updatedById: "test" },
    update: {},
  })
  vi.mocked(requireTenantContext).mockResolvedValue({
    tenantId: tenant.id,
    user: { id: user.id },
    member: { role: "owner" },
  } as Awaited<ReturnType<typeof requireTenantContext>>)
  const payment = await db8.orm.public.Payment.create({
    tenantId: tenant.id,
    kind: "order",
    checkoutSessionId: `cs_${Date.now()}`,
    paymentIntentId: "pi_1",
    amountCents: 10_000,
    feeCents: 320,
    status: "succeeded",
  })
  return { tenant, payment }
}

describe("refunds (6.8)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a refund records a row and returns the fee proportionally", async () => {
    const { tenant, payment } = await provision()
    const res = await refundPayment({ paymentId: payment.id, amountCents: 5000 })
    expect(res.error).toBeUndefined()
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_1", amount: 5000, refund_application_fee: true }),
      expect.anything()
    )
    const row = await db8.orm.public.Refund.where({ tenantId: tenant.id, paymentId: payment.id }).first()
    expect(row).not.toBeNull()
    expect(row!.amountCents).toBe(5000)
    // 320 fee on 10,000; refund 5,000 → 160 returned.
    expect(row!.feeRefundCents).toBe(160)
    const p = await db8.orm.public.Payment.where({ id: payment.id }).first()
    expect(p!.status).toBe("partially_refunded")
  })

  it("a full refund flips the payment to refunded", async () => {
    const { payment } = await provision()
    await refundPayment({ paymentId: payment.id })
    const p = await db8.orm.public.Payment.where({ id: payment.id }).first()
    expect(p!.status).toBe("refunded")
  })

  it("a refund on an unsucceeded payment is rejected", async () => {
    const { tenant } = await provision()
    const pending = await db8.orm.public.Payment.create({
      tenantId: tenant.id,
      kind: "order",
      paymentIntentId: null,
      amountCents: 1000,
      status: "pending",
    })
    const res = await refundPayment({ paymentId: pending.id })
    expect(res.error).toBe("invalid_input")
  })
})
