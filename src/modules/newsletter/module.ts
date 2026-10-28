import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

async function subscriberRows(ctx: TenantContext) {
  return tenantDb(ctx, (db) => db.NewsletterSubscriber.all())
}

/** The first real module through the lifecycle (decision 2-A): tenant
 * subscribers. Purge batches by id; export returns one JSON file. */
export default defineModule({
  key: "newsletter",
  name: "Newsletter",
  version: "1.0.0",
  stage: "stable",
  models: ["NewsletterSubscriber"],
  dashboard: { nav: [{ href: "newsletter", label: "Newsletter", icon: "mail" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const n = (await subscriberRows(ctx)).length
      return { "newsletter.subscribers": n }
    },
    onExport: async (ctx: TenantContext) => ({
      "newsletter.subscribers.json": JSON.stringify(await subscriberRows(ctx), null, 2),
    }),
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const rows = (await tenantDb(ctx, (db) => db.NewsletterSubscriber.select("id").all())) as Array<{ id: string }>
      const slice = rows.slice(0, batch)
      for (const row of slice) {
        await tenantDb(ctx, (db) => db.NewsletterSubscriber.where({ id: row.id }).delete())
      }
      return rows.length - slice.length
    },
  },
})
