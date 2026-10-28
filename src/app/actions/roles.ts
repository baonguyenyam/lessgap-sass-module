"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { foldPermissions, tenantRoleSchema } from "@/lib/schemas/tenant"
import { getEntitlements } from "@/platform/entitlements"
import { auditRequest } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { permissionsAreDeclared, ROLE_PERMISSIONS, withPluginGrants } from "@/platform/tenancy/permissions"

const ROLES = "/t/[slug]/roles"

async function memberCount(tenantId: string, role: string): Promise<number> {
  return db8.orm.public.Member.where({ organizationId: tenantId, role })
    .aggregate((a) => ({ n: a.count() }))
    .then((r) => r.n)
}

/**
 * Create (`existing` null) or edit a custom role ("nhóm quyền"), from the roles
 * drawer. Refuses built-in keys, malformed keys and any permission the catalog
 * does not declare (tests R2, R5). An edit keeps the key and changes the
 * permissions. Needs the `roles.custom` feature, and a new role must fit under
 * `roles.max` (task 1.8b; the plugin enforces the same cap through
 * `maximumRolesPerOrganization`).
 */
export async function saveTenantRole(existing: string | null, values: unknown): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("roles", "manage")
  const t = await getTranslations("dashboard.roles.errors")
  const entitlements = await getEntitlements(ctx)
  if (!entitlements.has("roles.custom")) return { error: t("featureUnavailable") }
  const parsed = tenantRoleSchema({ roleKey: t("roleKey"), permissionsRequired: t("permissionsRequired") }).safeParse(
    values
  )
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const role = existing ?? parsed.data.role
  if (role in ROLE_PERMISSIONS) return { error: t("builtIn") }

  const permission = foldPermissions(parsed.data.permissions)
  if (Object.keys(permission).length === 0 || !permissionsAreDeclared(permission))
    return { error: t("unknownPermission") }
  // What the person checked, plus the plugin statements it implies (task 1.3).
  const stored = withPluginGrants(permission)

  if (existing === null) {
    const max = entitlements.limit("roles.max")
    const count = await db8.orm.public.OrganizationRole.where({ organizationId: ctx.tenantId })
      .aggregate((a) => ({ n: a.count() }))
      .then((r) => r.n)
    if (max !== null && count >= max) return { error: t("limitReached", { max }) }
    await auth.api.createOrgRole({
      headers: await headers(),
      body: { organizationId: ctx.tenantId, role, permission: stored },
    })
  } else {
    await auth.api.updateOrgRole({
      headers: await headers(),
      body: { organizationId: ctx.tenantId, roleName: role, data: { permission: stored } },
    })
  }
  await auditRequest(ctx, {
    action: existing === null ? "tenancy.role.created" : "tenancy.role.updated",
    targetType: "role",
    targetId: role,
    data: { permission },
  })
  revalidatePath(ROLES, "page")
  return {}
}

/**
 * Delete custom roles, from a row or in bulk. Built-ins are undeletable, and so
 * is a role that still has members (R3, R4): those are skipped.
 */
export async function deleteTenantRoles(roles: string[]): Promise<{ deleted: number }> {
  const ctx = await requireTenantContext("roles", "manage")
  if (!(await getEntitlements(ctx)).has("roles.custom")) return { deleted: 0 }
  let deleted = 0
  for (const role of [...new Set(roles)].slice(0, 100)) {
    if (role in ROLE_PERMISSIONS) continue
    if ((await memberCount(ctx.tenantId, role)) > 0) continue
    await auth.api.deleteOrgRole({ headers: await headers(), body: { organizationId: ctx.tenantId, roleName: role } })
    await auditRequest(ctx, {
      action: "tenancy.role.deleted",
      targetType: "role",
      targetId: role,
    })
    deleted += 1
  }
  revalidatePath(ROLES, "page")
  return { deleted }
}
