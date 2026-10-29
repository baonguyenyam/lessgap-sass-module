import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The analytics module (task 8.7): a tenant's site page views — the
 * `SitePageView` counter the `/api/view` beacon upserts and the
 * `/t/<slug>/analytics` page reads. */
export default defineModule({
  key: "analytics",
  name: "Analytics",
  version: "1.0.0",
  stage: "stable",
  models: ["SitePageView"],
  dashboard: { nav: [{ href: "analytics", label: "Analytics", icon: "bar-chart" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => ({
      "analytics.page_views": await tenantDb(ctx, (db) => db.SitePageView.all().then((r) => r.length)),
    }),
    onExport: async (ctx: TenantContext) => ({
      "analytics.page_views.json": JSON.stringify(await tenantDb(ctx, (db) => db.SitePageView.all()), null, 2),
    }),
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const rows = await tenantDb(ctx, (db) => db.SitePageView.select("id").all())
      for (const row of (rows as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.SitePageView.where({ id: row.id }).delete())
      }
      return (rows as { id: string }[]).length - Math.min(batch, (rows as { id: string }[]).length)
    },
  },
})
