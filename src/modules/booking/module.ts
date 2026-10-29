import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The booking module (task 5.3, spec/07): resources, weekly availability
 * rules, time-off and the appointments they gate — with their status
 * history. Purge batches by id: events first (they reference appointments),
 * then appointments, then rules/time-off/resources; export returns one JSON
 * file per model. `Customer` rows are the customers module's. */
export default defineModule({
  key: "booking",
  name: "Booking",
  version: "1.0.0",
  stage: "stable",
  models: ["Resource", "AvailabilityRule", "TimeOff", "Appointment", "AppointmentEvent"],
  dashboard: { nav: [{ href: "calendar", label: "Calendar", icon: "calendar" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [appointments, events, rules, timeOff, resources] = await Promise.all([
        tenantDb(ctx, (db) => db.Appointment.all()),
        tenantDb(ctx, (db) => db.AppointmentEvent.all()),
        tenantDb(ctx, (db) => db.AvailabilityRule.all()),
        tenantDb(ctx, (db) => db.TimeOff.all()),
        tenantDb(ctx, (db) => db.Resource.all()),
      ])
      return {
        "booking.appointments": appointments.length,
        "booking.events": events.length,
        "booking.rules": rules.length,
        "booking.timeOff": timeOff.length,
        "booking.resources": resources.length,
      }
    },
    onExport: async (ctx: TenantContext) => {
      const [appointments, events, rules, timeOff, resources] = await Promise.all([
        tenantDb(ctx, (db) => db.Appointment.all()),
        tenantDb(ctx, (db) => db.AppointmentEvent.all()),
        tenantDb(ctx, (db) => db.AvailabilityRule.all()),
        tenantDb(ctx, (db) => db.TimeOff.all()),
        tenantDb(ctx, (db) => db.Resource.all()),
      ])
      return {
        "booking.appointments.json": JSON.stringify(appointments, null, 2),
        "booking.events.json": JSON.stringify(events, null, 2),
        "booking.rules.json": JSON.stringify(rules, null, 2),
        "booking.timeOff.json": JSON.stringify(timeOff, null, 2),
        "booking.resources.json": JSON.stringify(resources, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const events = await tenantDb(ctx, (db) => db.AppointmentEvent.select("id").all())
      for (const row of (events as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.AppointmentEvent.where({ id: row.id }).delete())
      }
      const appointments = await tenantDb(ctx, (db) => db.Appointment.select("id").all())
      for (const row of (appointments as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Appointment.where({ id: row.id }).delete())
      }
      const timeOff = await tenantDb(ctx, (db) => db.TimeOff.select("id").all())
      for (const row of (timeOff as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.TimeOff.where({ id: row.id }).delete())
      }
      const rules = await tenantDb(ctx, (db) => db.AvailabilityRule.select("id").all())
      for (const row of (rules as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.AvailabilityRule.where({ id: row.id }).delete())
      }
      const resources = await tenantDb(ctx, (db) => db.Resource.select("id").all())
      for (const row of (resources as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.Resource.where({ id: row.id }).delete())
      }
      return (appointments as { id: string }[]).length - Math.min(batch, (appointments as { id: string }[]).length)
    },
  },
})
