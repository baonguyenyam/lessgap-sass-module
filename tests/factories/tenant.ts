import { auth } from "@/auth"
import { db8, type Row } from "@/lib/db8"
import { newId } from "@/lib/ids"
import { createUser } from "@tests/factories/user"

export type TenantFactoryInput = { name?: string; slug?: string; ownerId?: string }

/**
 * A tenant created the way the product creates one (task 1.2): through the
 * Better Auth organization plugin, with its owner as the first member. The
 * owner is a fresh user unless one is given.
 */
export async function createTenant(
  overrides: TenantFactoryInput = {}
): Promise<{ tenant: Row<"Tenant">; owner: Row<"User"> }> {
  const owner = overrides.ownerId
    ? (await db8.orm.public.User.where({ id: overrides.ownerId }).first())!
    : await createUser({ name: "Tenant Owner" })
  const suffix = newId().slice(0, 8)
  const created = await auth.api.createOrganization({
    body: {
      name: overrides.name ?? `Tenant ${suffix}`,
      slug: overrides.slug ?? `tenant-${suffix}`,
      userId: owner.id,
    },
  })
  const tenant = (await db8.orm.public.Tenant.where({ id: created!.id }).first())!
  return { tenant, owner }
}

/** Adds a user (a fresh one unless given) to a tenant with a role, through the plugin. */
export async function createMember(
  tenantId: string,
  options: { role?: string; userId?: string } = {}
): Promise<{ member: Row<"Member">; user: Row<"User"> }> {
  const user = options.userId
    ? (await db8.orm.public.User.where({ id: options.userId }).first())!
    : await createUser({ name: "Tenant Member" })
  await auth.api.addMember({ body: { userId: user.id, organizationId: tenantId, role: options.role ?? "staff" } })
  const member = (await db8.orm.public.Member.where({ organizationId: tenantId, userId: user.id }).first())!
  return { member, user }
}
