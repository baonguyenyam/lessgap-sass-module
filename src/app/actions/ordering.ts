"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { canCharge, createCheckout } from "@/platform/payments/connect"
import { pickupSlots, orderLineTotal } from "@/lib/ordering/slots"
import { resolveHost } from "@/platform/tenancy/host"
import { upsertCustomer } from "@/platform/booking/customer"

/** The ordering flow (task 6.5): a diner picks menu items + modifiers + a
 * pickup slot; `placeOrder` re-checks slot capacity, writes Order+OrderLines
 * (modifiers as JSON), and asks `payments` for the session. */
const NEXT_STATUS: Record<string, string> = {
  received: "preparing",
  preparing: "ready",
  ready: "done",
}

export async function placeOrder(input: {
  lines: { variantId: string; quantity: number; modifierIds?: string[] }[]
  pickupSlot: string
  name: string
  phone?: string
}) {
  try {
    const host = (await headers()).get("host") ?? ""
    const resolved = await resolveHost(host)
    if (resolved.kind !== "site") throw new AppError("not_found")
    const c = systemContext(resolved.tenantId, "customer")
    await requireModule(c, "ordering")
    if (!input.name.trim() || input.lines.length === 0) throw new AppError("invalid_input")
    const tenant = await db8.orm.public.Tenant.where({ id: resolved.tenantId }).first()
    if (!tenant || !canCharge(tenant)) throw new AppError("forbidden")
    const [variants, modifiers, existing, settings] = await Promise.all([
      db8.orm.public.ProductVariant.where({ tenantId: resolved.tenantId }).include("product").all(),
      db8.orm.public.ProductModifier.where({ tenantId: resolved.tenantId }).all(),
      db8.orm.public.Order.where({ tenantId: resolved.tenantId }).all(),
      db8.orm.public.TenantSetting.where({ tenantId: resolved.tenantId }).all(),
    ])
    const capRow = settings.find((s) => s.key === "ordering.kitchen_capacity")
    const capacity = typeof capRow?.value === "number" ? capRow.value : 3
    const ruleRows = await db8.orm.public.ReservationRule.where({ tenantId: resolved.tenantId }).all()
    const free = pickupSlots(
      ruleRows.map((r) => ({
        weekday: r.weekday,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
        slotMinutes: r.slotMinutes,
      })),
      capacity,
      existing.map((o) => ({ pickupSlot: o.pickupSlot, status: o.status })),
      { startTs: new Date().toISOString(), endTs: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString() }
    )
    if (!free.find((s) => s.startTs === input.pickupSlot)) throw new AppError("conflict")
    const byId = new Map(modifiers.map((m) => [m.id, m]))
    const variantById = new Map(variants.map((v) => [v.id, v]))
    let total = 0
    const lineRows: {
      name: string
      quantity: number
      unitPriceCents: number
      modifiers: { name: string; priceCents: number }[]
      variantId: string
    }[] = []
    for (const l of input.lines) {
      const variant = variantById.get(l.variantId)
      if (!variant || variant.product?.type !== "menu_item") throw new AppError("invalid_input")
      const mods = (l.modifierIds ?? []).map((id) => {
        const m = byId.get(id)
        if (!m) throw new AppError("invalid_input")
        return { name: m.name, priceCents: m.priceCents }
      })
      const unit = variant.priceCents + mods.reduce((s, m) => s + m.priceCents, 0)
      total += orderLineTotal(variant.priceCents, mods, l.quantity)
      lineRows.push({
        name: `${variant.product!.name} · ${variant.name}`,
        quantity: l.quantity,
        unitPriceCents: unit,
        modifiers: mods,
        variantId: variant.id,
      })
    }
    const customerId = await upsertCustomer(resolved.tenantId, {
      name: input.name.trim(),
      phone: input.phone,
      source: "site",
    })
    const order = await db8.orm.public.Order.create({
      tenantId: resolved.tenantId,
      customerId,
      customerName: input.name.trim(),
      customerPhone: input.phone ?? null,
      totalCents: total,
      fulfilment: "pickup",
      pickupSlot: input.pickupSlot,
      status: "received",
    })
    for (const l of lineRows) {
      await db8.orm.public.OrderLine.create({
        tenantId: resolved.tenantId,
        orderId: order.id,
        variantId: l.variantId,
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        modifiers: l.modifiers,
      })
    }
    const origin = `https://${host}`
    const checkout = await createCheckout(c, {
      kind: "order",
      amountCents: total,
      description: `Order ${order.id.slice(-6)}`,
      successUrl: `${origin}/sites/${resolved.slug}/order?ordered=${order.id}`,
      cancelUrl: `${origin}/sites/${resolved.slug}/order`,
      orderId: order.id,
    })
    await audit(c, {
      action: "ordering.order_placed",
      targetType: "Order",
      targetId: order.id,
      data: { totalCents: total },
    })
    return { orderId: order.id, checkoutUrl: checkout.checkoutUrl }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/** The order board (task 6.5): received → preparing → ready → done; a step
 * the kitchen takes on the board, audited. */
export async function setOrderStatus(input: { orderId: string; toStatus: string }) {
  try {
    const c = await requireTenantContext("orders", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "ordering")
    const order = await db8.orm.public.Order.where({ tenantId: c.tenantId, id: input.orderId }).first()
    if (!order) throw new AppError("not_found")
    if (NEXT_STATUS[order.status] !== input.toStatus) throw new AppError("invalid_input")
    await db8.orm.public.Order.where({ id: order.id }).update({ status: input.toStatus })
    await audit(ctx, {
      action: "ordering.status_changed",
      targetType: "Order",
      targetId: order.id,
      data: { to: input.toStatus },
    })
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
