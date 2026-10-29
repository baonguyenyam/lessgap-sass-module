import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The payments module (task 6.3, spec/07): Stripe Connect onboarding,
 * `Payment`/`Refund` rows, and the payouts view. Other modules ask it for a
 * checkout — none of them talks to Stripe directly. */
export default defineModule({
  key: "payments",
  name: "Payments",
  version: "1.0.0",
  stage: "stable",
  models: ["Payment", "Refund"],
  dashboard: { nav: [{ href: "settings/payments", label: "Payments", icon: "credit-card" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [payments, refunds] = await Promise.all([
        tenantDb(ctx, (db) => db.Payment.all()),
        tenantDb(ctx, (db) => db.Refund.all()),
      ])
      return { "payments.payments": payments.length, "payments.refunds": refunds.length }
    },
    onExport: async (ctx: TenantContext) => {
      const [payments, refunds] = await Promise.all([
        tenantDb(ctx, (db) => db.Payment.all()),
        tenantDb(ctx, (db) => db.Refund.all()),
      ])
      return {
        "payments.payments.json": JSON.stringify(payments, null, 2),
        "payments.refunds.json": JSON.stringify(refunds, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      let left = 0
      const refunds = await tenantDb(ctx, (db) => db.Refund.select("id").all())
      for (const row of (refunds as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Refund.where({ id: row.id }).delete())
      }
      left += (refunds as { id: string }[]).length - Math.min(batch, (refunds as { id: string }[]).length)
      const payments = await tenantDb(ctx, (db) => db.Payment.select("id").all())
      for (const row of (payments as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Payment.where({ id: row.id }).delete())
      }
      left += (payments as { id: string }[]).length - Math.min(batch, (payments as { id: string }[]).length)
      return left
    },
  },
})
