import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db8, uniqueIndexKey } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { subscriptionDates } from "@/lib/billing"
import type Stripe from "stripe"
import { emailEnabled } from "@/lib/email-transport"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        await handleChargeRefunded(charge)
        break
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

const longDate = (date: Date) => date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "payment") {
    await handleOneTimeCheckout(session)
    return
  }

  if (!session.subscription || !session.metadata?.userId) return

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
    expand: ["items.data.price.product"],
  })

  const item = subscription.items.data[0]
  const priceId = item?.price.id
  if (!priceId) return

  const plan = await db8.orm.public.Plan.where({ stripePriceId: priceId }).first()
  if (!plan) return

  const { currentPeriodStart, currentPeriodEnd, trialEndsAt } = subscriptionDates(subscription)

  // Idempotency guard for side effects. Stripe delivers events at least once and
  // retries on errors, so the same checkout.session.completed can arrive twice.
  // The upsert below is idempotent, but the confirmation email is not — so we
  // only send it when this is a genuinely new subscription, not a replay of an
  // event we've already applied. (For higher volume, a dedicated table keyed on
  // event.id is the more general webhook-idempotency pattern.)
  const existingSub = await db8.orm.public.Subscription.select("stripeSubscriptionId")
    .where({ userId: session.metadata.userId })
    .first()
  const isNewSubscription = existingSub?.stripeSubscriptionId !== subscription.id

  const fields = {
    planId: plan.id,
    stripeSubscriptionId: subscription.id,
    status: mapSubscriptionStatus(subscription.status),
    currentPeriodStart: toTs(currentPeriodStart),
    currentPeriodEnd: toTs(currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEndsAt: toTs(trialEndsAt),
  }
  await db8.orm.public.Subscription.upsert({
    conflictOn: uniqueIndexKey({ userId: session.metadata.userId }),
    update: fields,
    create: { userId: session.metadata.userId, ...fields },
  })

  // Send subscription confirmation email (fire-and-forget)
  const user = await db8.orm.public.User.select("email", "name").where({ id: session.metadata.userId }).first()
  if (isNewSubscription && user && emailEnabled()) {
    const { sendSubscriptionConfirmation } = await import("@/lib/email")
    // Awaited: a promise left running after the response has no guarantee of
    // finishing on a serverless platform. It cannot fail the webhook, because a
    // refusal is reported and logged rather than thrown.
    await sendSubscriptionConfirmation(
      user.email,
      user.name ?? "",
      plan.name,
      plan.price,
      "usd",
      longDate(currentPeriodEnd),
      // Nothing has been charged yet on a trial, so the email says when the
      // first charge happens instead of announcing an active subscription.
      subscription.status === "trialing" && trialEndsAt ? longDate(trialEndsAt) : undefined
    ).catch(console.error)
  }
}

// One-time (mode: "payment") checkouts become a Purchase row. The PaymentIntent
// id is the idempotency key: Stripe delivers events at least once, and a replay
// finds the existing row, so the grant and the email both happen exactly once.
async function handleOneTimeCheckout(session: Stripe.Checkout.Session) {
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId
  // A payment session without our metadata wasn't created by /api/checkout
  // (e.g. a Payment Link): acknowledge it so Stripe doesn't retry.
  if (!paymentIntentId || !userId || !planId) return

  const plan = await db8.orm.public.Plan.where({ id: planId }).first()
  if (!plan) return

  const existing = await db8.orm.public.Purchase.select("id").where({ stripePaymentIntentId: paymentIntentId }).first()
  const isNewPurchase = !existing

  await db8.orm.public.Purchase.upsert({
    conflictOn: uniqueIndexKey({ stripePaymentIntentId: paymentIntentId }),
    update: {},
    create: {
      userId,
      planId,
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: session.id,
      amount: session.amount_total ?? plan.price,
      currency: session.currency ?? "usd",
    },
  })

  if (isNewPurchase && emailEnabled()) {
    const user = await db8.orm.public.User.select("email", "name").where({ id: userId }).first()
    if (user) {
      const { sendPurchaseConfirmation } = await import("@/lib/email")
      await sendPurchaseConfirmation(
        user.email,
        user.name ?? "",
        plan.name,
        session.amount_total ?? plan.price,
        session.currency ?? "usd"
      ).catch(console.error)
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await db8.orm.public.Subscription.where({ stripeSubscriptionId: subscription.id }).first()
  if (!existing) return

  const item = subscription.items.data[0]
  const priceId = item?.price.id
  const plan = priceId ? await db8.orm.public.Plan.where({ stripePriceId: priceId }).first() : null

  const { currentPeriodStart, currentPeriodEnd, trialEndsAt } = subscriptionDates(subscription)

  await db8.orm.public.Subscription.where({ stripeSubscriptionId: subscription.id }).update({
    ...(plan && { planId: plan.id }),
    status: mapSubscriptionStatus(subscription.status),
    currentPeriodStart: toTs(currentPeriodStart),
    currentPeriodEnd: toTs(currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEndsAt: toTs(trialEndsAt),
  })

  // Send cancellation email when subscription will cancel at period end
  if (subscription.cancel_at_period_end && !existing.cancelAtPeriodEnd) {
    const user = await db8.orm.public.User.select("email", "name").where({ id: existing.userId }).first()
    if (user && emailEnabled()) {
      const { sendSubscriptionCancelledEmail } = await import("@/lib/email")
      await sendSubscriptionCancelledEmail(user.email, user.name ?? "", longDate(currentPeriodEnd)).catch(console.error)
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db8.orm.public.Subscription.where({ stripeSubscriptionId: subscription.id }).updateAndCount({
    status: "CANCELED",
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe API 2026, subscription reference is in invoice.parent.subscription_details.subscription
  const subRef = invoice.parent?.subscription_details?.subscription
  if (!subRef) return
  const subscriptionId = typeof subRef === "string" ? subRef : subRef.id

  await db8.orm.public.Subscription.where({ stripeSubscriptionId: subscriptionId }).updateAndCount({
    status: "PAST_DUE",
  })
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // charge.refunded is only true when FULLY refunded; a partial refund keeps
  // the purchase (and the access it grants) intact.
  if (!charge.refunded) return

  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id
  if (!paymentIntentId) return

  await db8.orm.public.Purchase.where({ stripePaymentIntentId: paymentIntentId }).updateAndCount({
    status: "REFUNDED",
  })
}

function mapSubscriptionStatus(status: string) {
  const map: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "TRIALING" | "INCOMPLETE"> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
  }
  return map[status] ?? "INCOMPLETE"
}
