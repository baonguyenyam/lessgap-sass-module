"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { TENANT_ROLE_KEYS } from "@/platform/tenancy/permissions"

const MEMBERS = "/dashboard/members"

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1),
})

/** Invite a sub-user by email. Owner/manager only via `members.invite`. */
export async function inviteMember(formData: FormData) {
  const ctx = await requireTenantContext("members", "invite")
  const input = inviteSchema.parse({
    email: formData.get("email"),
    role: formData.get("role"),
  })
  const knownRoles = await listRoleKeys(ctx.tenantId)
  if (!knownRoles.includes(input.role)) throw new Error("Unknown role")

  await auth.api.createInvitation({
    headers: await headers(),
    body: { email: input.email, role: input.role, organizationId: ctx.tenantId },
  })
  revalidatePath(MEMBERS)
}

const roleSchema = z.object({ memberId: z.string().min(1), role: z.string().min(1) })

async function ownerCount(tenantId: string): Promise<number> {
  return db8.orm.public.Member.where({ organizationId: tenantId, role: "owner" })
    .aggregate((a) => ({ n: a.count() }))
    .then((r) => r.n)
}

async function listRoleKeys(tenantId: string): Promise<string[]> {
  const custom = await db8.orm.public.OrganizationRole.select("role").where({ organizationId: tenantId }).all()
  return [...TENANT_ROLE_KEYS, ...custom.map((r) => r.role)]
}

/** The last owner can never be demoted or removed (spec test R3). */
async function assertNotLastOwner(tenantId: string, memberId: string) {
  const target = await db8.orm.public.Member.where({ id: memberId, organizationId: tenantId }).first()
  if (!target) throw new Error("Member not found")
  if (target.role === "owner" && (await ownerCount(tenantId)) <= 1) {
    throw new Error("The last owner cannot be demoted or removed")
  }
  return target
}

export async function changeMemberRole(formData: FormData) {
  const ctx = await requireTenantContext("members", "manage")
  const input = roleSchema.parse({ memberId: formData.get("memberId"), role: formData.get("role") })
  const knownRoles = await listRoleKeys(ctx.tenantId)
  if (!knownRoles.includes(input.role)) throw new Error("Unknown role")
  await assertNotLastOwner(ctx.tenantId, input.memberId)

  await auth.api.updateMemberRole({
    headers: await headers(),
    body: { memberId: input.memberId, role: input.role },
  })
  revalidatePath(MEMBERS)
}

export async function removeMember(formData: FormData) {
  const ctx = await requireTenantContext("members", "manage")
  const memberId = String(formData.get("memberId") ?? "")
  if (!memberId) throw new Error("Member id is required")
  const target = await assertNotLastOwner(ctx.tenantId, memberId)
  if (target.userId === ctx.user.id) throw new Error("You cannot remove yourself")

  await auth.api.removeMember({
    headers: await headers(),
    body: { memberIdOrEmail: memberId },
  })
  revalidatePath(MEMBERS)
}
