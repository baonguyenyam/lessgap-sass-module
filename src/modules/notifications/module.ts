import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The notifications module (task 5.6, spec/07): one sender — `notify` —
 * and every message logged in `NotificationLog`. Always on (a tenant
 * without it books silently); its own lifecycle covers the log rows. */
export default defineModule({
  key: "notifications",
  name: "Notifications",
  version: "1.0.0",
  stage: "stable",
  models: ["NotificationLog"],
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const logs = await tenantDb(ctx, (db) => db.NotificationLog.all())
      return { "notifications.log": logs.length }
    },
    onExport: async (ctx: TenantContext) => {
      const logs = await tenantDb(ctx, (db) => db.NotificationLog.all())
      return { "notifications.log.json": JSON.stringify(logs, null, 2) }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const logs = await tenantDb(ctx, (db) => db.NotificationLog.select("id").all())
      for (const row of (logs as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.NotificationLog.where({ id: row.id }).delete())
      }
      return (logs as { id: string }[]).length - Math.min(batch, (logs as { id: string }[]).length)
    },
  },
})
