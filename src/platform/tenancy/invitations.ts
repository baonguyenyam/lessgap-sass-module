import { db8 } from "@/lib/db8"
import { invitationState, type InvitationState } from "@/lib/invitations"
import { toDate } from "@/lib/timestamps"
import { TENANT_ROLE_KEYS } from "@/platform/tenancy/permissions"

/** The roles a member can be given in a tenant: the built-in ones, then its custom roles by name (spec/adr/0019). */
export async function tenantRoleKeys(tenantId: string): Promise<string[]> {
  const custom = await db8.orm.public.OrganizationRole.select("role")
    .where({ organizationId: tenantId })
    .orderBy((r) => r.role.asc())
    .all()
  return [...TENANT_ROLE_KEYS, ...custom.map((r) => r.role)]
}

export type InvitationView = {
  id: string
  email: string
  role: string
  state: InvitationState
  tenant: { name: string; slug: string }
  inviter: string
}

/**
 * One invitation with what the invite page shows (task 1.8), or null for an
 * unknown id. Read across tenants on purpose: the invitee is not a member yet.
 * The id is a random cuid, the only key to it.
 */
export async function findInvitation(id: string, now = new Date()): Promise<InvitationView | null> {
  const invitation = await db8.orm.public.Invitation.where({ id }).first()
  if (!invitation) return null
  const [tenant, inviter] = await Promise.all([
    db8.orm.public.Tenant.select("name", "slug").where({ id: invitation.organizationId }).first(),
    db8.orm.public.User.select("name", "email").where({ id: invitation.inviterId }).first(),
  ])
  if (!tenant) return null
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    state: invitationState({ status: invitation.status, expiresAt: toDate(invitation.expiresAt) }, now),
    tenant: { name: tenant.name, slug: tenant.slug },
    inviter: inviter?.name || inviter?.email || "",
  }
}
