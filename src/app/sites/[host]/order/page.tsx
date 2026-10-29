import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { connection } from "next/server"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import { canCharge } from "@/platform/payments/connect"
import { OrderClient } from "@/components/ordering/order-client"

/** The site order page (task 6.5): menu items with modifiers + a pickup
 * slot — buy hidden until the tenant can charge. */
export default async function OrderPage() {
  await connection()
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()
  const c = systemContext(resolved.tenantId, "customer")
  await requireModule(c, "ordering")
  const t = await getTranslations("site.order")
  const [tenant, products, groups, modifiers, rules, existing, settings] = await Promise.all([
    db8.orm.public.Tenant.where({ id: resolved.tenantId }).first(),
    db8.orm.public.Product.where({ tenantId: resolved.tenantId, type: "menu_item", isActive: true })
      .include("variants")
      .all(),
    db8.orm.public.ProductModifierGroup.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.ProductModifier.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.ReservationRule.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.Order.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.TenantSetting.where({ tenantId: resolved.tenantId }).all(),
  ])
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <OrderClient
        now={new Date().toISOString()}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          variants: p.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents })),
        }))}
        groups={groups.map((g) => ({
          id: g.id,
          productId: g.productId,
          name: g.name,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
        }))}
        modifiers={modifiers.map((m) => ({ id: m.id, groupId: m.groupId, name: m.name, priceCents: m.priceCents }))}
        rules={rules.map((r) => ({
          weekday: r.weekday,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          slotMinutes: r.slotMinutes,
        }))}
        capacity={
          typeof settings.find((s) => s.key === "ordering.kitchen_capacity")?.value === "number"
            ? (settings.find((s) => s.key === "ordering.kitchen_capacity")!.value as number)
            : 3
        }
        existing={existing.map((o) => ({ pickupSlot: o.pickupSlot, status: o.status }))}
        canCharge={canCharge(tenant ?? {})}
      />
    </div>
  )
}
