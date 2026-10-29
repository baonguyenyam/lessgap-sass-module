import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { syncAccountStatus, markPaymentSucceeded } from "@/platform/payments/connect"
import type Stripe from "stripe"

/** The Connect webhook (task 6.3, spec/05): a separate endpoint + signing
 * secret from platform billing. `account.updated` syncs the tenant's
 * capabilities; `checkout.session.completed` on a connected account flips
 * the `Payment` — idempotent on replay (row already succeeded = no-op). */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }
  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account
      if (account.id) await syncAccountStatus(account.id)
      break
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const intent = typeof session.payment_intent === "string" ? session.payment_intent : null
      await markPaymentSucceeded(session.id, intent)
      break
    }
  }
  return NextResponse.json({ received: true })
}
