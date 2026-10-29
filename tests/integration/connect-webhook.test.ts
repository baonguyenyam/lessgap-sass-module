import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { stripe } from "@/lib/stripe"
import { POST } from "@/app/api/webhooks/connect/route"
import { resetDatabase } from "@tests/helpers/db"
import { NextRequest } from "next/server"

const SECRET = "whsec_connect_test"
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = SECRET
// generateTestHeaderString signs locally — the SDK never calls the API,
// but the lazy proxy throws without a key set.
process.env.STRIPE_SECRET_KEY = "sk_test_dummy"

vi.mock("@/platform/payments/connect", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/payments/connect")>()
  return { ...mod, syncAccountStatus: vi.fn() }
})
const { syncAccountStatus } = await import("@/platform/payments/connect")

function signedRequest(payload: object): NextRequest {
  const body = JSON.stringify(payload)
  const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET })
  return new NextRequest("http://localhost/api/webhooks/connect", {
    method: "POST",
    headers: { "stripe-signature": header },
    body,
  })
}

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `pay-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "P",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "PayCo", slug: `pay-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE", stripeAccountId: "acct_123" })
  return { tenant }
}

describe("connect webhook (6.3)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("account.updated syncs the tenant by account id", async () => {
    await provision()
    const res = await POST(
      signedRequest({ type: "account.updated", data: { object: { id: "acct_123", charges_enabled: true } } })
    )
    expect(res.status).toBe(200)
    expect(syncAccountStatus).toHaveBeenCalledWith("acct_123")
  })

  it("rejects a forged signature", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/webhooks/connect", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=bad" },
        body: JSON.stringify({ type: "account.updated", data: { object: { id: "x" } } }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("checkout.session.completed flips the Payment once — a replay is a no-op", async () => {
    const { tenant } = await provision()
    await db8.orm.public.Payment.create({
      tenantId: tenant.id,
      kind: "deposit",
      checkoutSessionId: "cs_1",
      amountCents: 2000,
      feeCents: 58,
    })
    const event = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_intent: "pi_1" } },
    }
    await POST(signedRequest(event))
    let row = await db8.orm.public.Payment.where({ checkoutSessionId: "cs_1" }).first()
    expect(row!.status).toBe("succeeded")
    expect(row!.paymentIntentId).toBe("pi_1")
    // Replay — same row, still one success.
    await POST(signedRequest(event))
    row = await db8.orm.public.Payment.where({ checkoutSessionId: "cs_1" }).first()
    expect(row!.status).toBe("succeeded")
  })

  it("a checkout on an unknown session is a no-op", async () => {
    const res = await POST(
      signedRequest({ type: "checkout.session.completed", data: { object: { id: "cs_missing" } } })
    )
    expect(res.status).toBe(200)
  })
})
