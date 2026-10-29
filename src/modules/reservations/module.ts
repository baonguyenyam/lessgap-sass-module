import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The reservations module (task 5.8, spec/07): restaurant tables, service
 * periods, and reservations — the booking module's sibling where the unit
 * is a party and a table. */
export default defineModule({
  key: "reservations",
  name: "Reservations",
  version: "1.0.0",
  stage: "stable",
  models: ["Table", "ReservationRule", "Reservation"],
  dashboard: { nav: [{ href: "reservations", label: "Reservations", icon: "utensils" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [tables, rules, reservations] = await Promise.all([
        tenantDb(ctx, (db) => db.Table.all()),
        tenantDb(ctx, (db) => db.ReservationRule.all()),
        tenantDb(ctx, (db) => db.Reservation.all()),
      ])
      return {
        "reservations.tables": tables.length,
        "reservations.rules": rules.length,
        "reservations.reservations": reservations.length,
      }
    },
    onExport: async (ctx: TenantContext) => {
      const [tables, rules, reservations] = await Promise.all([
        tenantDb(ctx, (db) => db.Table.all()),
        tenantDb(ctx, (db) => db.ReservationRule.all()),
        tenantDb(ctx, (db) => db.Reservation.all()),
      ])
      return {
        "reservations.tables.json": JSON.stringify(tables, null, 2),
        "reservations.rules.json": JSON.stringify(rules, null, 2),
        "reservations.reservations.json": JSON.stringify(reservations, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      let left = 0
      const reservations = await tenantDb(ctx, (db) => db.Reservation.select("id").all())
      for (const row of (reservations as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Reservation.where({ id: row.id }).delete())
      }
      left += (reservations as { id: string }[]).length - Math.min(batch, (reservations as { id: string }[]).length)
      const rules = await tenantDb(ctx, (db) => db.ReservationRule.select("id").all())
      for (const row of (rules as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.ReservationRule.where({ id: row.id }).delete())
      }
      left += (rules as { id: string }[]).length - Math.min(batch, (rules as { id: string }[]).length)
      const tables = await tenantDb(ctx, (db) => db.Table.select("id").all())
      for (const row of (tables as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Table.where({ id: row.id }).delete())
      }
      left += (tables as { id: string }[]).length - Math.min(batch, (tables as { id: string }[]).length)
      return left
    },
  },
})
