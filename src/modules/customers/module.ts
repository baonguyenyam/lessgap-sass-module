import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The customers module (task 5.5, spec/07): the tenant's customer list —
 * bookers with no login, deduplicated by email then phone, with recorded
 * consent. `Customer` is the privacy boundary: export and delete act on one
 * tenant's rows and never cross it. */
export default defineModule({
  key: "customers",
  name: "Customers",
  version: "1.0.0",
  stage: "stable",
  models: ["Customer"],
  dashboard: { nav: [{ href: "customers", label: "Customers", icon: "users" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const customers = await tenantDb(ctx, (db) => db.Customer.all())
      return { "customers.customers": customers.length }
    },
    onExport: async (ctx: TenantContext) => {
      const customers = await tenantDb(ctx, (db) => db.Customer.all())
      return { "customers.customers.json": JSON.stringify(customers, null, 2) }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const customers = await tenantDb(ctx, (db) => db.Customer.select("id").all())
      for (const row of (customers as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Customer.where({ id: row.id }).delete())
      }
      return (customers as { id: string }[]).length - Math.min(batch, (customers as { id: string }[]).length)
    },
  },
})
