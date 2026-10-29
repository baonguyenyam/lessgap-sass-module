"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomBytes } from "node:crypto"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { getEntitlements } from "@/platform/entitlements"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { canCharge, createCheckout } from "@/platform/payments/connect"
import { validateFormAnswers, quoteTotal, type FormDefinition } from "@/lib/quotes/form"
import { resolveHost } from "@/platform/tenancy/host"
import { upsertCustomer } from "@/platform/booking/customer"
import { notify } from "@/platform/notify"
import { toTs } from "@/lib/timestamps"

/** The quote flow (task 6.6, spec/07): request → price → signed link →
 * accept (optional deposit) → convert. `QuoteEvent` records every step. */

// The tenant's per-quote request form — a JSON `FormDefinition` on
// `TenantSetting` key `quotes.form`.
async function formDefinition(tenantId: string): Promise<FormDefinition> {
  const row = await db8.orm.public.TenantSetting.where({ tenantId, key: "quotes.form" }).first()
  return Array.isArray(row?.value) ? (row.value as FormDefinition) : []
}

export async function submitQuoteRequest(input: {
  customerName: string
  customerEmail: string
  customerPhone?: string
  answers: Record<string, unknown>
}) {
  try {
    const host = (await headers()).get("host") ?? ""
    const resolved = await resolveHost(host)
    if (resolved.kind !== "site") throw new AppError("not_found")
    const c = systemContext(resolved.tenantId, "customer")
    await requireModule(c, "quotes")
    if (!input.customerName.trim() || !input.customerEmail.trim()) throw new AppError("invalid_input")
    const check = validateFormAnswers(await formDefinition(resolved.tenantId), input.answers)
    if (!check.ok) throw new AppError("invalid_input")
    const entitlements = await getEntitlements(c)
    const monthly = entitlements.limit("quotes.monthly")
    if (monthly !== null) {
      const since = new Date()
      since.setUTCDate(1)
      since.setUTCHours(0, 0, 0, 0)
      const count = (
        await db8.orm.public.QuoteRequest.where({ tenantId: resolved.tenantId })
          .where((x) => x.createdAt.gte(since.toISOString()))
          .select("id")
          .all()
      ).length
      if (count >= monthly) throw new AppError("limit_reached")
    }
    await db8.orm.public.QuoteRequest.create({
      tenantId: resolved.tenantId,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      customerPhone: input.customerPhone ?? null,
      answersJson: input.answers as never,
    })
    await audit(c, { action: "quotes.request_submitted", targetType: "QuoteRequest", targetId: resolved.tenantId })
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function sendQuote(input: {
  requestId?: string
  customerName: string
  customerEmail: string
  lines: { name: string; quantity: number; unitPriceCents: number }[]
  validUntil?: string
  terms?: string
  depositCents?: number
}) {
  try {
    const c = await requireTenantContext("quotes", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "quotes")
    if (input.lines.length === 0 || !input.customerEmail.trim()) throw new AppError("invalid_input")
    const accessToken = randomBytes(24).toString("base64url")
    const quote = await db8.orm.public.Quote.create({
      tenantId: c.tenantId,
      requestId: input.requestId ?? null,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      totalCents: quoteTotal(input.lines),
      depositCents: input.depositCents ?? null,
      validUntil: input.validUntil ? toTs(new Date(input.validUntil)) : null,
      terms: input.terms ?? null,
      status: "sent",
      accessToken,
    })
    for (const l of input.lines) {
      await db8.orm.public.QuoteLine.create({
        tenantId: c.tenantId,
        quoteId: quote.id,
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
      })
    }
    await db8.orm.public.QuoteEvent.create({ tenantId: c.tenantId, quoteId: quote.id, kind: "sent" })
    if (input.requestId) {
      await db8.orm.public.QuoteRequest.where({ id: input.requestId }).update({ status: "quoted" })
    }
    const host = (await headers()).get("host") ?? ""
    await notify(ctx, "quotes.sent", input.customerEmail, {
      name: input.customerName,
      acceptUrl: `https://${host}/sites/x/quote/accept/${accessToken}`,
      totalCents: (quote.totalCents / 100).toFixed(2),
    })
    await audit(ctx, { action: "quotes.sent", targetType: "Quote", targetId: quote.id })
    revalidatePath("/t")
    return { id: quote.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function acceptQuote(input: { token: string }) {
  try {
    const host = (await headers()).get("host") ?? ""
    const resolved = await resolveHost(host)
    if (resolved.kind !== "site") throw new AppError("not_found")
    const quote = await db8.orm.public.Quote.where({ tenantId: resolved.tenantId, accessToken: input.token }).first()
    if (!quote || quote.status !== "sent") throw new AppError("not_found")
    if (quote.validUntil && new Date(quote.validUntil.replace(" ", "T") + "Z") < new Date()) {
      throw new AppError("invalid_input")
    }
    const c = systemContext(resolved.tenantId, "customer")
    const customerId = await upsertCustomer(resolved.tenantId, {
      name: quote.customerName,
      email: quote.customerEmail,
      source: "site",
    })
    await db8.orm.public.Quote.where({ id: quote.id }).update({ status: "accepted", customerId })
    await db8.orm.public.QuoteEvent.create({ tenantId: resolved.tenantId, quoteId: quote.id, kind: "accepted" })
    // A deposit? The tenant asked money up front — hand them to checkout.
    const tenant = await db8.orm.public.Tenant.where({ id: resolved.tenantId }).first()
    if (quote.depositCents && tenant && canCharge(tenant)) {
      const checkout = await createCheckout(c, {
        kind: "quote",
        amountCents: quote.depositCents,
        description: `Quote ${quote.id.slice(-6)} deposit`,
        successUrl: `https://${host}/sites/${resolved.slug}/quote/accepted`,
        cancelUrl: `https://${host}/sites/${resolved.slug}/quote/accept/${input.token}`,
        customerEmail: quote.customerEmail,
        quoteId: quote.id,
      })
      return { accepted: true, checkoutUrl: checkout.checkoutUrl }
    }
    await audit(c, { action: "quotes.accepted", targetType: "Quote", targetId: quote.id })
    return { accepted: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function declineQuote(input: { token: string }) {
  try {
    const host = (await headers()).get("host") ?? ""
    const resolved = await resolveHost(host)
    if (resolved.kind !== "site") throw new AppError("not_found")
    const quote = await db8.orm.public.Quote.where({ tenantId: resolved.tenantId, accessToken: input.token }).first()
    if (!quote || quote.status !== "sent") throw new AppError("not_found")
    await db8.orm.public.Quote.where({ id: quote.id }).update({ status: "declined" })
    await db8.orm.public.QuoteEvent.create({ tenantId: resolved.tenantId, quoteId: quote.id, kind: "declined" })
    return { declined: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/** Convert an accepted quote into an order (spec/07 — "converts to an
 * order or appointment"; an order covers the multi-line shape). */
export async function convertQuote(input: { quoteId: string }) {
  try {
    const c = await requireTenantContext("quotes", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "quotes")
    const quote = await db8.orm.public.Quote.where({ tenantId: c.tenantId, id: input.quoteId }).include("lines").first()
    if (!quote || quote.status !== "accepted") throw new AppError("invalid_input")
    const order = await db8.orm.public.Order.create({
      tenantId: c.tenantId,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      totalCents: quote.totalCents,
      fulfilment: "pickup",
      status: "received",
    })
    for (const l of quote.lines) {
      await db8.orm.public.OrderLine.create({
        tenantId: c.tenantId,
        orderId: order.id,
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
      })
    }
    await db8.orm.public.Quote.where({ id: quote.id }).update({ status: "converted" })
    await db8.orm.public.QuoteEvent.create({
      tenantId: c.tenantId,
      quoteId: quote.id,
      kind: "converted",
      dataJson: { orderId: order.id },
    })
    await audit(ctx, {
      action: "quotes.converted",
      targetType: "Quote",
      targetId: quote.id,
      data: { orderId: order.id },
    })
    revalidatePath("/t")
    return { orderId: order.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
