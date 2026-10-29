import { defineModule } from "@/platform/modules/define"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import type { TenantContext } from "@/platform/tenancy/context"

/** The team module (task 4.3, spec/07): staff shown on the site — not tenant
 * members, may never have a login. Purge batches by id; export one JSON file
 * per model. */
export default defineModule({
  key: "team",
  name: "Team",
  version: "1.0.0",
  stage: "stable",
  models: ["StaffMember", "StaffService"],
  dashboard: { nav: [{ href: "team", label: "Team", icon: "users" }] },
  lifecycle: {
    describeData: async (ctx: TenantContext) => {
      const [staff, links] = await Promise.all([
        tenantDb(ctx, (db) => db.StaffMember.all()),
        tenantDb(ctx, (db) => db.StaffService.all()),
      ])
      return { "team.staff": staff.length, "team.serviceLinks": links.length }
    },
    onExport: async (ctx: TenantContext) => {
      const [staff, links] = await Promise.all([
        tenantDb(ctx, (db) => db.StaffMember.all()),
        tenantDb(ctx, (db) => db.StaffService.all()),
      ])
      return {
        "team.staff.json": JSON.stringify(staff, null, 2),
        "team.serviceLinks.json": JSON.stringify(links, null, 2),
      }
    },
    onPurge: async (ctx: TenantContext, { batch }: { batch: number }) => {
      const links = await tenantDb(ctx, (db) => db.StaffService.select("id").all())
      for (const row of (links as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.StaffService.where({ id: row.id }).delete())
      }
      const staff = await tenantDb(ctx, (db) => db.StaffMember.select("id").all())
      for (const row of (staff as { id: string }[]).slice(0, batch)) {
        await tenantDb(ctx, (db) => db.StaffMember.where({ id: row.id }).delete())
      }
      return (staff as { id: string }[]).length - Math.min(batch, (staff as { id: string }[]).length)
    },
  },
})
