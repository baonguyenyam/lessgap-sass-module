import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The catalog module (task 4.2, spec/07): service categories, services with
 * duration and price, per-service variants. Purge batches by id — variants
 * first (they reference services), then services, then categories; export
 * returns one JSON file per model. */
export default defineModule({
  key: "catalog",
  name: "Catalog",
  version: "1.0.0",
  stage: "stable",
  models: ["ServiceCategory", "Service", "ServiceVariant"],
  dashboard: { nav: [{ href: "catalog", label: "Catalog", icon: "list" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [categories, services, variants] = await Promise.all([
        tenantDb(ctx, (db) => db.ServiceCategory.all()),
        tenantDb(ctx, (db) => db.Service.all()),
        tenantDb(ctx, (db) => db.ServiceVariant.all()),
      ])
      return {
        "catalog.categories": categories.length,
        "catalog.services": services.length,
        "catalog.variants": variants.length,
      }
    },
    onExport: async (ctx: TenantContext) => {
      const [categories, services, variants] = await Promise.all([
        tenantDb(ctx, (db) => db.ServiceCategory.all()),
        tenantDb(ctx, (db) => db.Service.all()),
        tenantDb(ctx, (db) => db.ServiceVariant.all()),
      ])
      return {
        "catalog.categories.json": JSON.stringify(categories, null, 2),
        "catalog.services.json": JSON.stringify(services, null, 2),
        "catalog.variants.json": JSON.stringify(variants, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const variants = await tenantDb(ctx, (db) => db.ServiceVariant.select("id").all())
      for (const row of (variants as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ServiceVariant.where({ id: row.id }).delete())
      }
      const services = await tenantDb(ctx, (db) => db.Service.select("id").all())
      for (const row of (services as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Service.where({ id: row.id }).delete())
      }
      const categories = await tenantDb(ctx, (db) => db.ServiceCategory.select("id").all())
      for (const row of (categories as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ServiceCategory.where({ id: row.id }).delete())
      }
      return (services as { id: string }[]).length - Math.min(batch, (services as { id: string }[]).length)
    },
  },
})
