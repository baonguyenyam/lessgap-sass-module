"use server"

import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { createOnboardingLink } from "@/platform/payments/connect"
import { refundFee } from "@/lib/billing/fee"
import { siteOrigin } from "@/platform/tenancy/site-origin"

/** Connect onboarding (task 6.3, spec/05): the owner clicks Connect in
 * Settings → Payments — we create the account once, hand back Stripe's
 * hosted onboarding link. Bank details never touch us. */
export async function startConnectOnboarding(): Promise<{ error?: string; url?: string }> {
  try {
    const c = await requireTenantContext("settings", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "payments")
    const tenant = await db8.orm.public.Tenant.where({ id: c.tenantId }).first()
    const url = await createOnboardingLink(
      c.tenantId,
      `${siteOrigin(tenant?.slug ?? "", null)}/t/${tenant?.slug}/settings/payments`
    )
    await audit(ctx, { action: "payments.connect_started", targetType: "Tenant", targetId: c.tenantId })
    return { url }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/** A refund (task 6.8, spec/05): Stripe returns the application fee
 * proportionally — `refund_application_fee: true`; the `Refund` row records
 * both amounts so the payouts view stays honest. */
export async function refundPayment(input: { paymentId: string; amountCents?: number }) {
  try {
    const c = await requireTenantContext("billing", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "payments")
    const payment = await db8.orm.public.Payment.where({ tenantId: c.tenantId, id: input.paymentId }).first()
    if (!payment || payment.status !== "succeeded" || !payment.paymentIntentId) throw new AppError("invalid_input")
    const refundAmount = input.amountCents ?? payment.amountCents
    if (refundAmount <= 0 || refundAmount > payment.amountCents) throw new AppError("invalid_input")
    const { stripe } = await import("@/lib/stripe")
    const tenant = await db8.orm.public.Tenant.where({ id: c.tenantId }).first()
    const feeRefund = refundFee(payment.feeCents, payment.amountCents, refundAmount)
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.paymentIntentId,
        amount: refundAmount,
        refund_application_fee: true,
      },
      { stripeAccount: tenant!.stripeAccountId! }
    )
    await db8.orm.public.Refund.create({
      tenantId: c.tenantId,
      paymentId: payment.id,
      stripeRefundId: refund.id,
      amountCents: refundAmount,
      feeRefundCents: feeRefund,
      status: refund.status ?? "succeeded",
    })
    await db8.orm.public.Payment.where({ id: payment.id }).update({
      status: refundAmount === payment.amountCents ? "refunded" : "partially_refunded",
    })
    await audit(ctx, {
      action: "payments.refunded",
      targetType: "Payment",
      targetId: payment.id,
      data: { amountCents: refundAmount, feeRefundCents: feeRefund },
    })
    revalidatePath("/t")
    return { id: refund.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
