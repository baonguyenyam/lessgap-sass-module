"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { inviteMemberSchema } from "@/lib/schemas/tenant"
import { mayGrantRole } from "@/lib/invitations"
import { audit, memberAuditContext } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { tenantRoleKeys } from "@/platform/tenancy/invitations"
import { memberCan } from "@/platform/tenancy/permissions"

const MEMBERS = "/t/[slug]/members"

async function ownerCount(tenantId: string): Promise<number> {
  return db8.orm.public.Member.where({ organizationId: tenantId, role: "owner" })
    .aggregate((a) => ({ n: a.count() }))
    .then((r) => r.n)
}

/** Better Auth's refusals an inviter can act on, by their code; anything else is a real error. */
const INVITE_REFUSALS: Record<string, string> = {
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "alreadyMember",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "alreadyInvited",
}

function refusalCode(error: unknown): string | undefined {
  const code = (error as { body?: { code?: unknown } } | null)?.body?.code
  return typeof code === "string" ? INVITE_REFUSALS[code] : undefined
}

/**
 * Invite a sub-user by email, from the members drawer (task 1.8). Needs
 * `members.invite` or `members.manage`; only an owner invites an owner. The
 * email goes out from the plugin's `sendInvitationEmail` hook in `src/auth.ts`.
 */
export async function inviteMember(values: unknown): Promise<{ error?: string }> {
  const ctx = await requireTenantContext()
  const t = await getTranslations("dashboard.members.errors")
  const allowed =
    ctx.member.status !== "suspended" &&
    ((await memberCan(ctx.tenantId, ctx.member.role, "members", "invite")) ||
      (await memberCan(ctx.tenantId, ctx.member.role, "members", "manage")))
  if (!allowed) return { error: t("forbidden") }
  const parsed = inviteMemberSchema({ invalidEmail: t("invalidEmail"), roleRequired: t("roleRequired") }).safeParse(
    values
  )
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!(await tenantRoleKeys(ctx.tenantId)).includes(parsed.data.role)) return { error: t("unknownRole") }
  if (!mayGrantRole(ctx.member.role, parsed.data.role)) return { error: t("ownerOnly") }

  // The table keeps one invitation per address and tenant: an expired,
  // declined or withdrawn one would block the new invitation.
  await db8.orm.public.Invitation.where({ organizationId: ctx.tenantId, email: parsed.data.email })
    .where((i) => i.status.neq("pending"))
    .delete()
  let invitation
  try {
    invitation = await auth.api.createInvitation({
      headers: await headers(),
      body: { email: parsed.data.email, role: parsed.data.role, organizationId: ctx.tenantId },
    })
  } catch (error) {
    const refusal = refusalCode(error)
    if (refusal) return { error: t(refusal) }
    throw error
  }
  await audit(memberAuditContext(ctx), {
    action: "tenancy.member.invited",
    targetType: "invitation",
    targetId: invitation.id,
    data: { email: parsed.data.email, role: parsed.data.role },
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
  if (!(await tenantRoleKeys(ctx.tenantId)).includes(role)) return { error: t("unknownRole") }

  const target = await db8.orm.public.Member.where({ id: memberId, organizationId: ctx.tenantId }).first()
  if (!target) return { error: t("notFound") }
  if (target.role === role) return {}
  if (!mayGrantRole(ctx.member.role, role) || !mayGrantRole(ctx.member.role, target.role)) {
    return { error: t("ownerOnly") }
  }
  if (target.role === "owner" && (await ownerCount(ctx.tenantId)) <= 1) return { error: t("lastOwner") }

  await auth.api.updateMemberRole({ headers: await headers(), body: { memberId, role } })
  await audit(memberAuditContext(ctx), {
    action: "tenancy.member.role_changed",
    targetType: "member",
    targetId: memberId,
    data: { from: target.role, to: role },
  })
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
      if (owners <= 1 || !mayGrantRole(ctx.member.role, "owner")) continue
      owners -= 1
    }
    await auth.api.removeMember({ headers: await headers(), body: { memberIdOrEmail: target.id } })
    await audit(memberAuditContext(ctx), {
      action: "tenancy.member.removed",
      targetType: "member",
      targetId: target.id,
      data: { userId: target.userId, role: target.role },
    })
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
  const allowed = targets.filter((m) => m.userId !== ctx.user.id && m.role !== "owner")
  if (allowed.length === 0) return { changed: 0 }

  const changed = await inTenant
    .where((m) => m.id.in(allowed.map((m) => m.id)))
    .updateAndCount({ status: suspended ? "suspended" : "active" })
  for (const target of allowed) {
    await audit(memberAuditContext(ctx), {
      action: suspended ? "tenancy.member.suspended" : "tenancy.member.reactivated",
      targetType: "member",
      targetId: target.id,
      data: { userId: target.userId },
    })
  }
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
  await audit(memberAuditContext(ctx), {
    action: "tenancy.invitation.canceled",
    targetType: "invitation",
    targetId: invitationId,
    data: { email: invite.email },
  })
  revalidatePath(MEMBERS, "page")
  return {}
}
