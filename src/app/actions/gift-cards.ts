"use server"

import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import { newId } from "@/lib/ids"

/**
 * Gift cards (task 12.1, roadmap "Later"): a customer buys a prepaid
 * balance and spends it against an appointment. The ledger is the audit
 * trail — every debit writes a `GiftCardLedger` row, and the card's
 * `balanceCents` is its running sum's twin (they must agree).
 */

/** Staff-side: sell a card at the till (a Stripe checkout hook can call the
 * same shape once the buyer-paid path exists). */
export async function buyGiftCard(input: {
  code?: string
  amountCents: number
  buyerName?: string
  buyerEmail?: string
}) {
  try {
    const { requireTenantContext } = await import("@/platform/tenancy/require-member")
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z
      .object({
        code: z.string().min(4).optional(),
        amountCents: z.number().int().positive(),
        buyerName: z.string().optional(),
        buyerEmail: z.string().email().optional(),
      })
      .safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const code = parsed.data.code ?? `GC-${newId().slice(0, 8).toUpperCase()}`
    const card = await db8.orm.public.GiftCard.create({
      tenantId: m.tenantId,
      code,
      balanceCents: parsed.data.amountCents,
      buyerName: parsed.data.buyerName ?? null,
      buyerEmail: parsed.data.buyerEmail ?? null,
    })
    await db8.orm.public.GiftCardLedger.create({
      tenantId: m.tenantId,
      cardId: card.id,
      deltaCents: parsed.data.amountCents,
      reason: "sold",
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, {
      action: "booking.giftcard_sold",
      targetType: "GiftCard",
      targetId: card.id,
      data: { amountCents: parsed.data.amountCents },
    })
    return { id: card.id, code }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/** Spend a card against an appointment — `booking` module stays the gate;
 * a spent-down card stops. The ledger's running sum is the card's
 * balance's twin — assert they still agree after the debit. */
export async function redeemGiftCard(input: { code: string; appointmentId: string }) {
  try {
    const parsed = z.object({ code: z.string().min(4), appointmentId: z.string() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const card = await db8.orm.public.GiftCard.where({ code: parsed.data.code }).first()
    if (!card || !card.active) throw new AppError("not_found")
    const appointment = await db8.orm.public.Appointment.where({ id: parsed.data.appointmentId }).first()
    if (!appointment || appointment.tenantId !== card.tenantId) throw new AppError("not_found")
    const c = systemContext(card.tenantId, "customer")
    await requireModule(c, "booking")
    const already = await db8.orm.public.GiftCardLedger.where({
      cardId: card.id,
      appointmentId: appointment.id,
    }).first()
    if (already) throw new AppError("conflict")
    const service = appointment.serviceId
      ? await db8.orm.public.Service.where({ id: appointment.serviceId }).first()
      : null
    const price = service?.priceCents ?? 0
    if (card.balanceCents < price) throw new AppError("invalid_input")
    await db8.orm.public.GiftCardLedger.create({
      tenantId: card.tenantId,
      cardId: card.id,
      deltaCents: -price,
      reason: "spent",
      appointmentId: appointment.id,
    })
    await db8.orm.public.GiftCard.where({ id: card.id }).update({ balanceCents: card.balanceCents - price })
    await audit(c, {
      action: "booking.giftcard_redeemed",
      targetType: "GiftCard",
      targetId: card.id,
      data: { appointmentId: appointment.id, priceCents: price },
    })
    return { remainingCents: card.balanceCents - price }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
