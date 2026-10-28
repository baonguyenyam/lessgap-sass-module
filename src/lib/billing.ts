import { db8, uniqueIndexKey, type Row } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import type Stripe from "stripe"

export type Plan = Row<"Plan">
export type BillingInterval = Plan["interval"]
export type SubscriptionStatus = Row<"Subscription">["status"]
export type PurchaseWithPlan = Row<"Purchase"> & { plan: Plan | null; addOn: Row<"AddOn"> | null }
export type SubscriptionWithPlan = Row<"Subscription"> & { plan: Plan }

// The user's current billing state, most privileged first. A lifetime purchase
// outranks a subscription; when both exist the subscription is still surfaced
// so the UI can point the user at the portal to cancel the now-redundant one.
// This is the single helper to copy when gating your own features.
export type Entitlement =
  | { kind: "lifetime"; purchase: PurchaseWithPlan; subscription: SubscriptionWithPlan | null }
  | { kind: "subscription"; subscription: SubscriptionWithPlan }
  | { kind: "free" }

export async function getEntitlement(tenantId: string): Promise<Entitlement> {
  const [purchase, subscription] = await Promise.all([
    db8.orm.public.Purchase.where({ tenantId, status: "COMPLETED", addOnId: null })
      .orderBy((p) => p.createdAt.desc())
      .include("plan")
      .include("addOn")
      .first(),
    db8.orm.public.Subscription.where({ tenantId }).include("plan").first(),
  ])

  // A subscription only counts while Stripe still manages it (same statuses
  // that block a new checkout): a CANCELED or INCOMPLETE row is history, not
  // an entitlement — those users are free and can check out again.
  const liveSubscription =
    subscription && (CHECKOUT_BLOCKING_STATUSES as readonly string[]).includes(subscription.status)
      ? (subscription as SubscriptionWithPlan)
      : null

  if (purchase) return { kind: "lifetime", purchase: purchase as PurchaseWithPlan, subscription: liveSubscription }
  if (liveSubscription) return { kind: "subscription", subscription: liveSubscription }
  return { kind: "free" }
}

// Subscription statuses that mean "there is a live subscription in Stripe that
// the billing portal can manage" — in-app checkout must not create a second one.
// INCOMPLETE (initial payment never went through) and CANCELED are not blocking.
export const CHECKOUT_BLOCKING_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID"] as const

// How many days of free trial a checkout for this plan should carry, or null
// for none. One trial per customer: a Subscription row outlives cancellation
// (tenantId is unique and the row stays behind as CANCELED), so "has had a
// subscription" is "has a row". Without that rule, cancelling and checking out
// again would restart the trial, for free, as often as anyone liked.
export function trialDaysFor(
  plan: { interval: BillingInterval; trialDays: number | null },
  hasHadSubscription: boolean
): number | null {
  if (plan.interval === "ONE_TIME" || hasHadSubscription) return null
  return plan.trialDays && plan.trialDays > 0 ? plan.trialDays : null
}

// The dates a Subscription row stores, read from a Stripe subscription. Since
// the 2026 API the billing period lives on the subscription item rather than
// on the subscription. The trial end stays on the subscription, and stays set
// once the trial is over.
export function subscriptionDates(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return {
    currentPeriodStart: new Date((item?.current_period_start ?? 0) * 1000),
    currentPeriodEnd: new Date((item?.current_period_end ?? 0) * 1000),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  }
}

// Stripe types the duration as open-ended, so a comparison does not narrow it.
const isKnownDuration = (duration: string): duration is DiscountSummary["duration"] =>
  duration === "once" || duration === "repeating" || duration === "forever"

export type DiscountSummary = {
  percentOff: number | null
  // In the smallest currency unit, like every Stripe amount.
  amountOff: number | null
  currency: string | null
  duration: "once" | "repeating" | "forever"
  endsAt: Date | null
  code: string | null
}

// What the billing page says about a discount on a subscription. Only an
// expanded coupon can be described: a bare id says nothing, and a coupon with
// no percentage, no amount or a duration this code does not know is left out
// rather than guessed at. The coupon sits under `source` since the 2025 API.
export function describeDiscount(discount: string | Stripe.Discount): DiscountSummary | null {
  if (typeof discount === "string") return null
  const coupon = discount.source?.coupon
  if (!coupon || typeof coupon === "string") return null
  if (coupon.percent_off == null && coupon.amount_off == null) return null
  const { duration } = coupon
  if (!isKnownDuration(duration)) return null
  const promotion = discount.promotion_code
  return {
    percentOff: coupon.percent_off,
    amountOff: coupon.amount_off,
    currency: coupon.currency,
    duration,
    endsAt: discount.end ? new Date(discount.end * 1000) : null,
    code: promotion && typeof promotion !== "string" ? promotion.code : null,
  }
}

/**
 * Assigns a plan with no Stripe price — the free plan (task 2.7, decision 2-C).
 * The tenant's single subscription row carries the plan and `ACTIVE` with no
 * Stripe subscription behind it: the resolver does not care whether Stripe
 * manages the row, only that the plan's feature map is there. Period fields
 * are required, so they cover the plan's interval from now; nothing renews or
 * expires a free plan's row.
 */
export async function assignFreePlan(tenantId: string, plan: { id: string; interval: BillingInterval }): Promise<void> {
  const start = new Date()
  const end = new Date(start)
  if (plan.interval === "YEAR") end.setFullYear(end.getFullYear() + 1)
  else end.setMonth(end.getMonth() + 1)
  const fields = {
    planId: plan.id,
    stripeSubscriptionId: null,
    status: "ACTIVE" as const,
    currentPeriodStart: toTs(start),
    currentPeriodEnd: toTs(end),
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
  }
  await db8.orm.public.Subscription.upsert({
    conflictOn: uniqueIndexKey({ tenantId }),
    update: fields,
    create: { tenantId, ...fields },
  })
}

/**
 * The line items a checkout session carries (task 2.7): the plan's price, plus
 * the one-time setup fee the plan declares — only on the tenant's first
 * checkout, so the fee charges once ever, not on every re-subscribe.
 */
export function checkoutLineItems(
  plan: { stripePriceId: string | null; meterEventName: string | null; setupFeeCents: number | null; name: string },
  isFirstCheckout: boolean
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    plan.meterEventName ? { price: plan.stripePriceId! } : { price: plan.stripePriceId!, quantity: 1 },
  ]
  if (isFirstCheckout && plan.setupFeeCents && plan.setupFeeCents > 0) {
    items.push({
      price_data: {
        currency: "usd",
        product_data: { name: `${plan.name} setup fee` },
        unit_amount: plan.setupFeeCents,
      },
      quantity: 1,
    })
  }
  return items
}
