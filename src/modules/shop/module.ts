import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The shop module (task 6.4, spec/07): products → anonymous cart →
 * checkout on the tenant's connected account → Order/OrderLine, pickup or
 * shipping. `payments` is the only module that talks to Stripe — shop asks
 * it for the session. */
export default defineModule({
  key: "shop",
  name: "Shop",
  version: "1.0.0",
  stage: "stable",
  dependsOn: ["payments"],
  models: ["ProductCategory", "Product", "ProductVariant", "Cart", "CartLine", "Order", "OrderLine"],
  dashboard: { nav: [{ href: "orders", label: "Orders", icon: "package" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [products, orders] = await Promise.all([
        tenantDb(ctx, (db) => db.Product.all()),
        tenantDb(ctx, (db) => db.Order.all()),
      ])
      return { "shop.products": products.length, "shop.orders": orders.length }
    },
    onExport: async (ctx: TenantContext) => {
      const [products, orders] = await Promise.all([
        tenantDb(ctx, (db) => db.Product.all()),
        tenantDb(ctx, (db) => db.Order.all()),
      ])
      return {
        "shop.products.json": JSON.stringify(products, null, 2),
        "shop.orders.json": JSON.stringify(orders, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      let left = 0
      const cartLines = await tenantDb(ctx, (db) => db.CartLine.select("id").all())
      for (const row of (cartLines as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.CartLine.where({ id: row.id }).delete())
      }
      left += (cartLines as { id: string }[]).length - Math.min(batch, (cartLines as { id: string }[]).length)
      const carts = await tenantDb(ctx, (db) => db.Cart.select("id").all())
      for (const row of (carts as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Cart.where({ id: row.id }).delete())
      }
      left += (carts as { id: string }[]).length - Math.min(batch, (carts as { id: string }[]).length)
      const orderLines = await tenantDb(ctx, (db) => db.OrderLine.select("id").all())
      for (const row of (orderLines as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.OrderLine.where({ id: row.id }).delete())
      }
      left += (orderLines as { id: string }[]).length - Math.min(batch, (orderLines as { id: string }[]).length)
      const orders = await tenantDb(ctx, (db) => db.Order.select("id").all())
      for (const row of (orders as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Order.where({ id: row.id }).delete())
      }
      left += (orders as { id: string }[]).length - Math.min(batch, (orders as { id: string }[]).length)
      const variants = await tenantDb(ctx, (db) => db.ProductVariant.select("id").all())
      for (const row of (variants as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ProductVariant.where({ id: row.id }).delete())
      }
      left += (variants as { id: string }[]).length - Math.min(batch, (variants as { id: string }[]).length)
      const products = await tenantDb(ctx, (db) => db.Product.select("id").all())
      for (const row of (products as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Product.where({ id: row.id }).delete())
      }
      left += (products as { id: string }[]).length - Math.min(batch, (products as { id: string }[]).length)
      const categories = await tenantDb(ctx, (db) => db.ProductCategory.select("id").all())
      for (const row of (categories as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ProductCategory.where({ id: row.id }).delete())
      }
      left += (categories as { id: string }[]).length - Math.min(batch, (categories as { id: string }[]).length)
      return left
    },
  },
})
