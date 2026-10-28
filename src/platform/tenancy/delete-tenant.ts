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

  const { NewsletterSubscriber, TenantModule, TenantSetting, Member, Invitation, OrganizationRole, Tenant } =
    db8.orm.public

  // Tenant-owned tables (MODEL_CLASSIFICATION).
  await Promise.all([
    NewsletterSubscriber.where({ tenantId }).deleteAndCount(),
    TenantModule.where({ tenantId }).deleteAndCount(),
    TenantSetting.where({ tenantId }).deleteAndCount(),
  ])

  // Better Auth tenant-identity tables (organizationId).
  await Promise.all([
    Member.where({ organizationId: tenantId }).deleteAndCount(),
    Invitation.where({ organizationId: tenantId }).deleteAndCount(),
    OrganizationRole.where({ organizationId: tenantId }).deleteAndCount(),
  ])

  await Tenant.where({ id: tenantId }).deleteAndCount()
}
