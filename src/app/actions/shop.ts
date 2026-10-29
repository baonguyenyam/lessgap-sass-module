"use server"

import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { getEntitlements } from "@/platform/entitlements"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { canCharge, createCheckout } from "@/platform/payments/connect"
import { cartTotal, orderTotal } from "@/lib/shop/totals"
import { resolveHost } from "@/platform/tenancy/host"
import { upsertCustomer } from "@/platform/booking/customer"
import { tenantPath } from "@/lib/tenant-paths"

/** The shop flow (task 6.4): an anonymous `Cart` keyed by a `cart_id`
 * cookie accumulates lines; checkout writes `Order`/`OrderLine` from the
 * same source and asks `payments` for the session — paid features hide
 * until `canCharge`. */
async function siteCtx() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") throw new AppError("not_found")
  return resolved
}

async function cartId(): Promise<{ key: string; isNew: boolean }> {
  const jar = await cookies()
  const existing = jar.get("cart_id")?.value
  if (existing) return { key: existing, isNew: false }
  const key = randomUUID()
  jar.set("cart_id", key, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 })
  return { key, isNew: true }
}

export async function addToCart(input: { variantId: string; quantity?: number }) {
  try {
    const site = await siteCtx()
    const c = systemContext(site.tenantId, "customer")
    await requireModule(c, "shop")
    const variant = await db8.orm.public.ProductVariant.where({ tenantId: site.tenantId, id: input.variantId }).first()
    if (!variant) throw new AppError("invalid_input")
    const { key } = await cartId()
    let cart = await db8.orm.public.Cart.where({ tenantId: site.tenantId, cartKey: key }).first()
    if (!cart) cart = await db8.orm.public.Cart.create({ tenantId: site.tenantId, cartKey: key })
    const line = await db8.orm.public.CartLine.where({
      tenantId: site.tenantId,
      cartId: cart.id,
      variantId: input.variantId,
    }).first()
    if (line) {
      await db8.orm.public.CartLine.where({ id: line.id }).update({ quantity: line.quantity + (input.quantity ?? 1) })
    } else {
      await db8.orm.public.CartLine.create({
        tenantId: site.tenantId,
        cartId: cart.id,
        variantId: input.variantId,
        quantity: input.quantity ?? 1,
      })
    }
    revalidatePath("/sites")
    return { cartId: cart.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function checkoutCart(input: { name: string; email?: string; phone?: string; fulfilment?: string }) {
  try {
    const site = await siteCtx()
    const c = systemContext(site.tenantId, "customer")
    await requireModule(c, "shop")
    if (!input.name.trim()) throw new AppError("invalid_input")
    const tenant = await db8.orm.public.Tenant.where({ id: site.tenantId }).first()
    if (!tenant || !canCharge(tenant)) throw new AppError("forbidden")
    const { key } = await cartId()
    const cart = await db8.orm.public.Cart.where({ tenantId: site.tenantId, cartKey: key }).first()
    if (!cart) throw new AppError("invalid_input")
    const lines = await db8.orm.public.CartLine.where({ tenantId: site.tenantId, cartId: cart.id })
      .include("variant")
      .all()
    if (lines.length === 0) throw new AppError("invalid_input")
    const fulfilment = input.fulfilment === "shipping" ? "shipping" : "pickup"
    const shipSetting = await db8.orm.public.TenantSetting.where({
      tenantId: site.tenantId,
      key: "shop.shipping_flat_cents",
    }).first()
    const subtotal = cartTotal(lines.map((l) => ({ quantity: l.quantity, unitPriceCents: l.variant!.priceCents })))
    const total = orderTotal(subtotal, fulfilment, typeof shipSetting?.value === "number" ? shipSetting.value : null)
    const customerId = await upsertCustomer(site.tenantId, {
      name: input.name.trim(),
      email: input.email,
      phone: input.phone,
      source: "site",
    })
    const order = await db8.orm.public.Order.create({
      tenantId: site.tenantId,
      customerId,
      customerName: input.name.trim(),
      customerEmail: input.email ?? null,
      customerPhone: input.phone ?? null,
      totalCents: total,
      fulfilment,
      status: "received",
    })
    for (const l of lines) {
      await db8.orm.public.OrderLine.create({
        tenantId: site.tenantId,
        orderId: order.id,
        variantId: l.variantId,
        name: l.variant!.name,
        quantity: l.quantity,
        unitPriceCents: l.variant!.priceCents,
      })
    }
    const origin = `https://${(await headers()).get("host")}`
    const checkout = await createCheckout(c, {
      kind: "order",
      amountCents: total,
      description: `Order ${order.id.slice(-6)}`,
      successUrl: `${origin}/sites/${site.slug}/shop?ordered=${order.id}`,
      cancelUrl: `${origin}/sites/${site.slug}/shop`,
      customerEmail: input.email,
      orderId: order.id,
    })
    await db8.orm.public.CartLine.where({ tenantId: site.tenantId, cartId: cart.id }).delete()
    await audit(c, {
      action: "shop.order_placed",
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

export async function addProduct(input: {
  name: string
  categoryId?: string
  type?: string
  priceCents: number
  description?: string
}) {
  try {
    const c = await import("@/platform/tenancy/require-member").then((m) => m.requireTenantContext("orders", "manage"))
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "shop")
    const entitlements = await getEntitlements(ctx)
    const max = entitlements.limit("shop.products.max")
    if (max !== null) {
      const count = (await db8.orm.public.Product.where({ tenantId: c.tenantId }).select("id").all()).length
      if (count >= max) throw new AppError("limit_reached")
    }
    const product = await db8.orm.public.Product.create({
      tenantId: c.tenantId,
      name: input.name.trim(),
      categoryId: input.categoryId ?? null,
      type: input.type ?? "physical",
      description: input.description ?? null,
    })
    await db8.orm.public.ProductVariant.create({
      tenantId: c.tenantId,
      productId: product.id,
      name: input.name.trim(),
      priceCents: input.priceCents,
    })
    await audit(ctx, { action: "shop.product_added", targetType: "Product", targetId: product.id })
    revalidatePath(tenantPath(c.tenantId, "orders"))
    return { id: product.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
