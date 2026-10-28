import { headers } from "next/headers"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { requireUser } from "@/lib/auth"
import { AppError } from "@/platform/errors"
import type { TenantContext } from "@/platform/tenancy/context"
import { memberCan, type TenantPermission, type TenantResource, type TenantVerb } from "@/platform/tenancy/permissions"
import type { FieldOutputTypes } from "@/generated/prisma8/contract.d"

type Tenant = FieldOutputTypes["public"]["Tenant"]
type Member = FieldOutputTypes["public"]["Member"]
export type CurrentUser = Awaited<ReturnType<typeof requireUser>>

export type TenantMembership = {
  user: CurrentUser
  member: Member
  tenant: Tenant
  tenantId: string
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace"

/** The member row linking `userId` to their first tenant, oldest first. */
export async function getMembership(userId: string): Promise<Member | null> {
  return db8.orm.public.Member.where({ userId })
    .orderBy((m) => m.createdAt.asc())
    .first()
}

/**
 * The tenant an owner lands on. Phase-1 decision 1-A: every existing user
 * gets one tenant named after them, and the tenant is created the first time
 * they need it (sign-up provisioning arrives with the phase-4 wizard).
 */
export async function ensureTenant(user: CurrentUser): Promise<TenantMembership> {
  const existing = await getMembership(user.id)
  if (existing) {
    const tenant = await db8.orm.public.Tenant.where({ id: existing.organizationId }).first()
    if (!tenant) throw new Error("Membership points at a tenant that no longer exists")
    return { user, member: existing, tenant, tenantId: existing.organizationId }
  }

  const displayName = user.name || user.email || "workspace"
  const base = slugify(displayName.includes("@") ? displayName.split("@")[0] : displayName)
  let slug = base
  for (let i = 2; await db8.orm.public.Tenant.where({ slug }).first(); i++) slug = `${base}-${i}`

  await auth.api.createOrganization({
    headers: await headers(),
    body: { name: displayName, slug },
  })
  const member = await getMembership(user.id)
  if (!member) throw new Error("Tenant creation did not produce a membership")

  // The onboarding wizard (phase 4) is what flips this in the full flow; while
  // it does not exist a new tenant is usable immediately.
  await db8.orm.public.Tenant.where({ id: member.organizationId, status: "PROVISIONING" }).update({ status: "ACTIVE" })
  const tenant = (await db8.orm.public.Tenant.where({ id: member.organizationId }).first())!
  return { user, member, tenant, tenantId: tenant.id }
}

/**
 * Membership + permission gate for tenant dashboard pages and actions. The
 * Better Auth plugin enforces its own check inside its endpoints; this is our
 * layer on top — it also covers pages and actions that are not plugin calls.
 * When `verb` is omitted the caller is only proven to belong to the tenant.
 */
export async function requireTenantContext<R extends TenantResource>(
  resource?: R,
  verb?: TenantVerb<R>
): Promise<TenantMembership> {
  const user = await requireUser()
  const ctx = await ensureTenant(user)
  const suspended = ctx.member.status === "suspended"
  if (resource && verb && (suspended || !(await memberCan(ctx.tenantId, ctx.member.role, resource, verb)))) {
    throw new AppError("forbidden")
  }
  return ctx
}

export type TenantMemberContext = TenantContext & {
  actor: { kind: "member"; userId: string; role: string }
  tenant: Tenant
  member: Member
}

/**
 * The membership of `userId` in the tenant at `slug`, checked against
 * `permission` (task 1.4). Read from the database on every call, so a member
 * removed or demoted loses access on their next request (T7).
 *
 * - no tenant at that slug, no membership, or a suspended membership →
 *   `not_found`: a stranger cannot tell a tenant exists;
 * - a member without the permission → `forbidden`.
 */
export async function resolveTenantMember(
  userId: string,
  slug: string,
  permission?: TenantPermission
): Promise<TenantMemberContext> {
  const tenant = await db8.orm.public.Tenant.where({ slug }).first()
  if (!tenant) throw new AppError("not_found")
  const member = await db8.orm.public.Member.where({ organizationId: tenant.id, userId }).first()
  if (!member || member.status === "suspended") throw new AppError("not_found")
  if (permission) {
    const [resource, verb] = permission.split(".") as [TenantResource, TenantVerb<TenantResource>]
    if (!(await memberCan(tenant.id, member.role, resource, verb))) throw new AppError("forbidden")
  }
  return { tenantId: tenant.id, actor: { kind: "member", userId, role: member.role }, tenant, member }
}

/** `resolveTenantMember` for the signed-in user: dashboard pages and actions under `/t/[slug]`. */
export async function requireTenantMember(slug: string, permission?: TenantPermission): Promise<TenantMemberContext> {
  const user = await requireUser()
  return resolveTenantMember(user.id, slug, permission)
}
