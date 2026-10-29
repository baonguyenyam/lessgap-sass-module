import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers({ host: "site.test" }) }
})
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})
vi.mock("@/platform/payments/connect", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/payments/connect")>()
  return { ...mod, createCheckout: vi.fn(async () => ({ paymentId: "p1", checkoutUrl: "https://pay.test/x" })) }
})
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})
vi.mock("@/platform/notify", () => ({ notify: vi.fn(async () => ({})) }))

const { submitQuoteRequest, sendQuote, acceptQuote, convertQuote } = await import("@/app/actions/quotes")
const { resolveHost } = await import("@/platform/tenancy/host")
const { requireTenantContext } = await import("@/platform/tenancy/require-member")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `q-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "Q",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "QuoteCo", slug: `quote-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({
    status: "ACTIVE",
    chargesEnabled: true,
    stripeAccountId: `acct_${tenant.id.slice(-8)}`,
  })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "quotes", enabled: true })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "shop", enabled: true })
  for (const key of ["module.quotes", "module.shop"]) {
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key },
      create: { key, value: true, updatedById: "test" },
      update: {},
    })
  }
  await db8.orm.public.TenantSetting.create({
    tenantId: tenant.id,
    key: "quotes.form",
    value: [{ key: "rooms", kind: "number", label: "Rooms", required: true }],
  })
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: tenant.slug })
  vi.mocked(requireTenantContext).mockResolvedValue({
    tenantId: tenant.id,
    user: { id: user.id },
    member: { role: "owner" },
  } as Awaited<ReturnType<typeof requireTenantContext>>)
  return { tenant, user }
}

describe("quotes (6.6)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("request → price → accept (with deposit) → convert to order", async () => {
    const { tenant } = await provision()
    // 1. A customer submits the schema-driven form.
    expect(
      (await submitQuoteRequest({ customerName: "Ana", customerEmail: "a@x.test", answers: { rooms: 3 } })).error
    ).toBeUndefined()
    const request = await db8.orm.public.QuoteRequest.where({ tenantId: tenant.id }).first()
    expect(request!.status).toBe("new")
    // 2. The tenant prices it.
    const sent = await sendQuote({
      requestId: request!.id,
      customerName: "Ana",
      customerEmail: "a@x.test",
      lines: [{ name: "Clean", quantity: 2, unitPriceCents: 5000 }],
      depositCents: 2000,
    })
    expect(sent.error).toBeUndefined()
    const quote = await db8.orm.public.Quote.where({ tenantId: tenant.id }).first()
    expect(quote!.status).toBe("sent")
    expect(quote!.totalCents).toBe(10_000)
    const req2 = await db8.orm.public.QuoteRequest.where({ id: request!.id }).first()
    expect(req2!.status).toBe("quoted")
    // 3. The customer accepts — a deposit quote goes to checkout.
    const accepted = await acceptQuote({ token: quote!.accessToken })
    expect(accepted.accepted).toBe(true)
    expect(accepted.checkoutUrl).toBe("https://pay.test/x")
    const q2 = await db8.orm.public.Quote.where({ id: quote!.id }).first()
    expect(q2!.status).toBe("accepted")
    // 4. The tenant converts it.
    const converted = await convertQuote({ quoteId: quote!.id })
    expect(converted.orderId).toBeDefined()
    const order = await db8.orm.public.Order.where({ tenantId: tenant.id }).first()
    expect(order!.totalCents).toBe(10_000)
    const q3 = await db8.orm.public.Quote.where({ id: quote!.id }).first()
    expect(q3!.status).toBe("converted")
  })

  it("a bad token cannot accept a quote", async () => {
    await provision()
    const res = await acceptQuote({ token: "forged" })
    expect(res.error).toBe("not_found")
  })

  it("the form definition validates answers server-side", async () => {
    await provision()
    const res = await submitQuoteRequest({ customerName: "Ana", customerEmail: "a@x.test", answers: { rooms: "two" } })
    expect(res.error).toBe("invalid_input")
  })
})
