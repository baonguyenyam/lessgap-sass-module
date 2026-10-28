import { headers } from "next/headers"
import { cache } from "react"
import { auth } from "@/auth"
import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { requireUser } from "@/lib/auth"
import { slugify } from "@/lib/slugify"
import { AppError } from "@/platform/errors"
import { LAST_TENANT_COOKIE, TENANT_SLUG_HEADER } from "@/platform/request-context"
import type { TenantContext } from "@/platform/tenancy/context"
import { assignFreePlan } from "@/lib/billing"
import { memberCan, type TenantPermission, type TenantResource, type TenantVerb } from "@/platform/tenancy/permissions"
import { getPlatformSettings } from "@/platform/settings/store"
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

/** The tenant slug of this request: the `/t/<slug>` path the proxy read, else the last one opened. */
async function preferredTenantSlug(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers")
    return (await headers()).get(TENANT_SLUG_HEADER) ?? (await cookies()).get(LAST_TENANT_COOKIE)?.value ?? null
  } catch {
    // Outside a request (a job, a script): no preference.
    return null
  }
}

/**
 * The member row for `userId` in the tenant this request is about: the tenant
 * of the `/t/<slug>` path, else the one last opened, else the oldest
 * membership. A preference the user does not belong to is ignored.
 */
export async function getMembership(userId: string): Promise<Member | null> {
  const slug = await preferredTenantSlug()
  if (slug) {
    const tenant = await db8.orm.public.Tenant.where({ slug }).first()
    const member = tenant ? await db8.orm.public.Member.where({ organizationId: tenant.id, userId }).first() : null
    if (member) return member
  }
  return db8.orm.public.Member.where({ userId })
    .orderBy((m) => m.createdAt.asc())
    .first()
}

/** Every tenant `userId` is an active member of, oldest membership first: the tenant switcher's list. */
export async function listMemberTenants(userId: string): Promise<Array<{ id: string; slug: string; name: string }>> {
  const members = await db8.orm.public.Member.where({ userId })
    .orderBy((m) => m.createdAt.asc())
    .all()
  const active = members.filter((m) => m.status !== "suspended")
  if (active.length === 0) return []
  const tenants = await db8.orm.public.Tenant.where((t) => t.id.in(active.map((m) => m.organizationId))).all()
  const byId = new Map(tenants.map((t) => [t.id, t]))
  return active.flatMap((m) => {
    const tenant = byId.get(m.organizationId)
    return tenant ? [{ id: tenant.id, slug: tenant.slug, name: tenant.name }] : []
  })
}

async function waitForMembership(userId: string, attempts = 10): Promise<Member | null> {
  for (let i = 0; i < attempts; i++) {
    const member = await getMembership(userId)
    if (member) return member
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return null
}

/**
 * The tenant an owner lands on. Phase-1 decision 1-A: every existing user
 * gets one tenant named after them, and the tenant is created the first time
 * they need it (sign-up provisioning arrives with the phase-4 wizard).
 */
export const ensureTenant = cache(async (user: CurrentUser): Promise<TenantMembership> => {
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

  try {
    await auth.api.createOrganization({
      body: { name: displayName, slug, userId: user.id },
    })
  } catch (error) {
    // Two requests of the same first visit (the dashboard layout and the
    // `/dashboard` redirect run in parallel, and `cache` only covers one
    // render) can both get here. The loser waits for the winner's member row,
    // which Better Auth writes just after the tenant.
    if (!(await waitForMembership(user.id))) throw error
  }
  const member = await getMembership(user.id)
  if (!member) throw new Error("Tenant creation did not produce a membership")

  const settings = await getPlatformSettings()
  // signup.free_plan.enabled (task 2.8): a new tenant starts on the free plan
  // — a Plan row with no Stripe price — so its feature map resolves before any
  // payment exists.
  if (settings["signup.free_plan.enabled"]) {
    const freePlan = await db8.orm.public.Plan.where((p) =>
      and(p.isActive.eq(true), p.stripePriceId.isNull(), p.price.eq(0), p.visibility.neq("ARCHIVED"))
    ).first()
    if (freePlan) await assignFreePlan(member.organizationId, freePlan)
  }
  // signup.require_approval (task 2.8): the tenant stays PROVISIONING — and so
  // 404 to its members — until staff set it ACTIVE in the console.
  if (!settings["signup.require_approval"]) {
    await db8.orm.public.Tenant.where({ id: member.organizationId, status: "PROVISIONING" }).update({
      status: "ACTIVE",
    })
  }
  const tenant = (await db8.orm.public.Tenant.where({ id: member.organizationId }).first())!
  return { user, member, tenant, tenantId: tenant.id }
})

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
  // Under /t/<slug> (task 1.7) the path names the tenant: membership and
  // permission come from it, not from whichever tenant the user joined first.
  const slug = (await headers()).get(TENANT_SLUG_HEADER)
  if (slug) {
    const permission = resource && verb ? (`${resource}.${verb}` as TenantPermission) : undefined
    const { tenant, member, tenantId } = await resolveTenantMember(user.id, slug, permission)
    return { user, member, tenant, tenantId }
  }
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
  // Suspended and canceled tenants answer not_found like an unknown slug: the
  // member learns nothing about the tenant's state by probing it (task 1.10).
  if (!tenant || tenant.status !== "ACTIVE") throw new AppError("not_found")
  const member = await db8.orm.public.Member.where({ organizationId: tenant.id, userId }).first()
  if (!member || member.status === "suspended") throw new AppError("not_found")
  if (permission) {
    const [resource, verb] = permission.split(".") as [TenantResource, TenantVerb<TenantResource>]
    if (!(await memberCan(tenant.id, member.role, resource, verb))) throw new AppError("forbidden")
  }
  return { tenantId: tenant.id, actor: { kind: "member", userId, role: member.role }, tenant, member }
}

/** Whether `userId` may open the tenant at `slug` at all: the proxy's check, so a stranger gets a real 404 (T6). */
export async function isTenantMember(userId: string, slug: string): Promise<boolean> {
  try {
    await resolveTenantMember(userId, slug)
    return true
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") return false
    throw error
  }
}

/** `resolveTenantMember` for the signed-in user: dashboard pages and actions under `/t/[slug]`. */
export async function requireTenantMember(slug: string, permission?: TenantPermission): Promise<TenantMemberContext> {
  const user = await requireUser()
  return resolveTenantMember(user.id, slug, permission)
}
