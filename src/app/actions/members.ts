"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { inviteMemberSchema } from "@/lib/schemas/tenant"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { TENANT_ROLE_KEYS } from "@/platform/tenancy/permissions"

const MEMBERS = "/t/[slug]/members"

async function ownerCount(tenantId: string): Promise<number> {
  return db8.orm.public.Member.where({ organizationId: tenantId, role: "owner" })
    .aggregate((a) => ({ n: a.count() }))
    .then((r) => r.n)
}

async function listRoleKeys(tenantId: string): Promise<string[]> {
  const custom = await db8.orm.public.OrganizationRole.select("role").where({ organizationId: tenantId }).all()
  return [...TENANT_ROLE_KEYS, ...custom.map((r) => r.role)]
}

/** Invite a sub-user by email, from the members drawer. Needs `members.invite`. */
export async function inviteMember(values: unknown): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("members", "invite")
  const t = await getTranslations("dashboard.members.errors")
  const parsed = inviteMemberSchema({ invalidEmail: t("invalidEmail"), roleRequired: t("roleRequired") }).safeParse(
    values
  )
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!(await listRoleKeys(ctx.tenantId)).includes(parsed.data.role)) return { error: t("unknownRole") }

  await auth.api.createInvitation({
    headers: await headers(),
    body: { email: parsed.data.email, role: parsed.data.role, organizationId: ctx.tenantId },
  })
  revalidatePath(MEMBERS, "page")
  return {}
}

/**
 * Change one member's role, from the members drawer. Needs `members.manage`.
 * The last owner can never be demoted (spec test R3).
 */
export async function setMemberRole(memberId: string, role: string): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("members", "manage")
  const t = await getTranslations("dashboard.members.errors")
  if (!(await listRoleKeys(ctx.tenantId)).includes(role)) return { error: t("unknownRole") }

  const target = await db8.orm.public.Member.where({ id: memberId, organizationId: ctx.tenantId }).first()
  if (!target) return { error: t("notFound") }
  if (target.role === role) return {}
  if (target.role === "owner" && (await ownerCount(ctx.tenantId)) <= 1) return { error: t("lastOwner") }

  await auth.api.updateMemberRole({ headers: await headers(), body: { memberId, role } })
  revalidatePath(MEMBERS, "page")
  return {}
}

/**
 * Remove members, from a row or in bulk. Needs `members.manage`. Never the
 * caller, never the last owner: those are skipped and the rest go.
 */
export async function removeMembers(memberIds: string[]): Promise<{ removed: number }> {
  const ctx = await requireTenantContext("members", "manage")
  const ids = [...new Set(memberIds)].slice(0, 200)
  if (ids.length === 0) return { removed: 0 }

  const targets = await db8.orm.public.Member.where({ organizationId: ctx.tenantId })
    .where((m) => m.id.in(ids))
    .all()
  let owners = await ownerCount(ctx.tenantId)
  let removed = 0
  for (const target of targets) {
    if (target.userId === ctx.user.id) continue
    if (target.role === "owner") {
      if (owners <= 1) continue
      owners -= 1
    }
    await auth.api.removeMember({ headers: await headers(), body: { memberIdOrEmail: target.id } })
    removed += 1
  }
  revalidatePath(MEMBERS, "page")
  return { removed }
}

/**
 * Suspend or reactivate members. Needs `members.manage`. Never the caller and
 * never an owner; a suspended member keeps the seat but is granted nothing.
 */
export async function setMembersSuspended(memberIds: string[], suspended: boolean): Promise<{ changed: number }> {
  const ctx = await requireTenantContext("members", "manage")
  const ids = [...new Set(memberIds)].slice(0, 200)
  if (ids.length === 0) return { changed: 0 }

  const inTenant = db8.orm.public.Member.where({ organizationId: ctx.tenantId })
  const targets = await inTenant.where((m) => m.id.in(ids)).all()
  const allowed = targets.filter((m) => m.userId !== ctx.user.id && m.role !== "owner").map((m) => m.id)
  if (allowed.length === 0) return { changed: 0 }

  const changed = await inTenant
    .where((m) => m.id.in(allowed))
    .updateAndCount({ status: suspended ? "suspended" : "active" })
  revalidatePath(MEMBERS, "page")
  return { changed }
}

/** Withdraw a pending invitation of this workspace. Needs `members.invite`. */
export async function cancelMemberInvitation(invitationId: string): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("members", "invite")
  const t = await getTranslations("dashboard.members.errors")
  const invite = await db8.orm.public.Invitation.where({
    id: invitationId,
    organizationId: ctx.tenantId,
    status: "pending",
  }).first()
  if (!invite) return { error: t("notFound") }

  await auth.api.cancelInvitation({ headers: await headers(), body: { invitationId } })
  revalidatePath(MEMBERS, "page")
  return {}
}
