import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The ordering module (task 6.5, spec/07): restaurant pickup ordering —
 * `menu_item` products with modifier groups, pickup slots with kitchen
 * capacity, and a dashboard status board. It reuses shop's `Order` rows
 * (`fulfilment: "pickup"`) and asks `payments` for the checkout. */
export default defineModule({
  key: "ordering",
  name: "Ordering",
  version: "1.0.0",
  stage: "stable",
  dependsOn: ["shop"],
  models: ["ProductModifierGroup", "ProductModifier"],
  dashboard: { nav: [{ href: "orders/board", label: "Order board", icon: "clipboard-list" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [groups, modifiers] = await Promise.all([
        tenantDb(ctx, (db) => db.ProductModifierGroup.all()),
        tenantDb(ctx, (db) => db.ProductModifier.all()),
      ])
      return { "ordering.modifier_groups": groups.length, "ordering.modifiers": modifiers.length }
    },
    onExport: async (ctx: TenantContext) => {
      const [groups, modifiers] = await Promise.all([
        tenantDb(ctx, (db) => db.ProductModifierGroup.all()),
        tenantDb(ctx, (db) => db.ProductModifier.all()),
      ])
      return {
        "ordering.modifier_groups.json": JSON.stringify(groups, null, 2),
        "ordering.modifiers.json": JSON.stringify(modifiers, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      let left = 0
      const modifiers = await tenantDb(ctx, (db) => db.ProductModifier.select("id").all())
      for (const row of (modifiers as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ProductModifier.where({ id: row.id }).delete())
      }
      left += (modifiers as { id: string }[]).length - Math.min(batch, (modifiers as { id: string }[]).length)
      const groups = await tenantDb(ctx, (db) => db.ProductModifierGroup.select("id").all())
      for (const row of (groups as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ProductModifierGroup.where({ id: row.id }).delete())
      }
      left += (groups as { id: string }[]).length - Math.min(batch, (groups as { id: string }[]).length)
      return left
    },
  },
})
