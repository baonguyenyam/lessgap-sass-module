import { db8 } from "@/lib/db8"
import { moduleRegistry } from "@/modules/registry"

/**
 * Deletes one tenant completely (phase 1, task 1.14). Module `onPurge` hooks
 * run first — batched and idempotent by contract — then every tenant-owned
 * and tenant-identity row goes before the Tenant row itself. The deletes are
 * explicit even though the foreign keys cascade: the T9 guarantee ("no
 * tenant-owned table holds a row with that id") must not depend on a cascade
 * surviving a later contract change.
 *
 * Platform-private rows (`AuditLog`, `EmailMessage`, `ErrorReport`, `Job`)
 * keep their `tenantId` — it is context for staff, not ownership — so the
 * audit trail of the deletion survives it.
 *
 * Called only by the `platform.tenant.delete` job; never from request code.
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  const modules = moduleRegistry as Record<string, { onPurge?: (tenantId: string) => Promise<void> | void }>
  for (const mod of Object.values(modules)) {
    if (mod.onPurge) await mod.onPurge(tenantId)
  }

  const {
    Appointment,
    AppointmentEvent,
    AvailabilityRule,
    Customer,
    Domain,
    Media,
    NotificationLog,
    Reservation,
    ReservationRule,
    Resource,
    Table,
    TimeOff,
    ModuleExport,
    ModulePurge,
    NewsletterSubscriber,
    Page,
    Service,
    ServiceCategory,
    ServiceVariant,
    Site,
    SiteSettings,
    StaffMember,
    StaffService,
    TenantModule,
    TenantSetting,
    Purchase,
    Subscription,
    TenantAddOn,
    EntitlementOverride,
    UsageCounter,
    Member,
    Invitation,
    OrganizationRole,
    Tenant,
  } = db8.orm.public

  // Tenant-owned tables (MODEL_CLASSIFICATION).
  await Promise.all([
    Appointment.where({ tenantId }).deleteAndCount(),
    AppointmentEvent.where({ tenantId }).deleteAndCount(),
    AvailabilityRule.where({ tenantId }).deleteAndCount(),
    Customer.where({ tenantId }).deleteAndCount(),
    Domain.where({ tenantId }).deleteAndCount(),
    Media.where({ tenantId }).deleteAndCount(),
    NotificationLog.where({ tenantId }).deleteAndCount(),
    Reservation.where({ tenantId }).deleteAndCount(),
    ReservationRule.where({ tenantId }).deleteAndCount(),
    Resource.where({ tenantId }).deleteAndCount(),
    Table.where({ tenantId }).deleteAndCount(),
    TimeOff.where({ tenantId }).deleteAndCount(),
    ModuleExport.where({ tenantId }).deleteAndCount(),
    ModulePurge.where({ tenantId }).deleteAndCount(),
    NewsletterSubscriber.where({ tenantId }).deleteAndCount(),
    Page.where({ tenantId }).deleteAndCount(),
    Service.where({ tenantId }).deleteAndCount(),
    ServiceCategory.where({ tenantId }).deleteAndCount(),
    ServiceVariant.where({ tenantId }).deleteAndCount(),
    StaffMember.where({ tenantId }).deleteAndCount(),
    StaffService.where({ tenantId }).deleteAndCount(),
    Site.where({ tenantId }).deleteAndCount(),
    SiteSettings.where({ tenantId }).deleteAndCount(),
    TenantModule.where({ tenantId }).deleteAndCount(),
    TenantSetting.where({ tenantId }).deleteAndCount(),
    Purchase.where({ tenantId }).deleteAndCount(),
    Subscription.where({ tenantId }).deleteAndCount(),
    TenantAddOn.where({ tenantId }).deleteAndCount(),
    EntitlementOverride.where({ tenantId }).deleteAndCount(),
    UsageCounter.where({ tenantId }).deleteAndCount(),
  ])

  // Better Auth tenant-identity tables (organizationId).
  await Promise.all([
    Member.where({ organizationId: tenantId }).deleteAndCount(),
    Invitation.where({ organizationId: tenantId }).deleteAndCount(),
    OrganizationRole.where({ organizationId: tenantId }).deleteAndCount(),
  ])

  await Tenant.where({ id: tenantId }).deleteAndCount()
}
