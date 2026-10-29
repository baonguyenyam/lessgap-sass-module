import { stripe } from "@/lib/stripe"
import { db8 } from "@/lib/db8"
import { computeApplicationFee, type FeeModel } from "@/lib/billing/fee"
import type { TenantContext } from "@/platform/tenancy/context"

/** Stripe Connect (task 6.3, ADR 0006): the tenant owns the connected
 * account — we create it, hand Stripe-hosted onboarding to the owner, and
 * sync `chargesEnabled`/`payoutsEnabled` from `account.updated` webhooks.
 * Every paid feature on the site hides until `canCharge` is true. */

/** A tenant can take money once Stripe says the account can charge. */
export function canCharge(tenant: { chargesEnabled?: boolean | null }): boolean {
  return tenant.chargesEnabled === true
}

/** Create the tenant's connected account (once — `stripeAccountId` is the
 * marker) and hand back the Stripe-hosted onboarding link. */
export async function createOnboardingLink(tenantId: string, returnUrl: string): Promise<string> {
  const tenant = await db8.orm.public.Tenant.where({ id: tenantId }).first()
  if (!tenant) throw new Error("tenant not found")
  let accountId = tenant.stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { tenantId },
    })
    accountId = account.id
    await db8.orm.public.Tenant.where({ id: tenantId }).update({
      stripeAccountId: accountId,
      connectOnboardingStatus: "pending",
    })
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  })
  return link.url
}

/** `account.updated` lands here: sync the account's capabilities onto the
 * tenant row. */
export async function syncAccountStatus(accountId: string): Promise<void> {
  const account = await stripe.accounts.retrieve(accountId)
  const status = account.charges_enabled ? "complete" : "pending"
  await db8.orm.public.Tenant.where({ stripeAccountId: accountId }).update({
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    connectOnboardingStatus: status,
  })
}

/** The tenant's fee model: plan JSON, then a `payment.fee_model`
 * TenantSetting override (decision 6-C). */
export async function resolveFeeModel(tenantId: string): Promise<FeeModel> {
  const override = await db8.orm.public.TenantSetting.where({ tenantId, key: "payment.fee_model" }).first()
  if (override?.value && typeof override.value === "object" && !Array.isArray(override.value)) {
    return override.value as FeeModel
  }
  const tenant = await db8.orm.public.Tenant.where({ id: tenantId }).first()
  const sub = tenant ? await db8.orm.public.Subscription.where({ tenantId }).first() : null
  const plan = sub?.planId ? await db8.orm.public.Plan.where({ id: sub.planId }).first() : null
  const model = plan?.feeModel
  if (model && typeof model === "object" && !Array.isArray(model)) return model as FeeModel
  return { model: "none" }
}

/** Create a Checkout Session on the connected account with the application
 * fee, and a `Payment` row idempotent on `checkoutSessionId`. Callers pass
 * the kind + optional link ids; nobody outside this file talks to Stripe. */
export async function createCheckout(
  ctx: TenantContext,
  input: {
    kind: string
    amountCents: number
    currency?: string
    description: string
    successUrl: string
    cancelUrl: string
    customerEmail?: string
    appointmentId?: string
    orderId?: string
    quoteId?: string
  }
): Promise<{ paymentId: string; checkoutUrl: string }> {
  const tenant = await db8.orm.public.Tenant.where({ id: ctx.tenantId }).first()
  if (!tenant || !canCharge(tenant) || !tenant.stripeAccountId) throw new Error("charges not enabled")
  const fee = computeApplicationFee(await resolveFeeModel(ctx.tenantId), input.amountCents)
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency ?? "usd",
            unit_amount: input.amountCents,
            product_data: { name: input.description },
          },
        },
      ],
      payment_intent_data: { application_fee_amount: fee.fee },
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { tenantId: ctx.tenantId, kind: input.kind },
    },
    { stripeAccount: tenant.stripeAccountId }
  )
  const payment = await db8.orm.public.Payment.create({
    tenantId: ctx.tenantId,
    kind: input.kind,
    checkoutSessionId: session.id,
    amountCents: input.amountCents,
    feeCents: fee.fee,
    currency: input.currency ?? "usd",
    status: "pending",
    appointmentId: input.appointmentId ?? null,
    orderId: input.orderId ?? null,
    quoteId: input.quoteId ?? null,
  })
  return { paymentId: payment.id, checkoutUrl: session.url ?? "" }
}

/** `checkout.session.completed` on a connected account — flip the Payment
 * to succeeded and stamp the intent. Idempotent: a replayed event is a
 * no-op on a row already succeeded. */
export async function markPaymentSucceeded(sessionId: string, paymentIntentId: string | null): Promise<void> {
  const payment = await db8.orm.public.Payment.where({ checkoutSessionId: sessionId }).first()
  if (!payment || payment.status === "succeeded") return
  await db8.orm.public.Payment.where({ id: payment.id }).update({
    status: "succeeded",
    paymentIntentId: paymentIntentId ?? payment.paymentIntentId,
  })
}
