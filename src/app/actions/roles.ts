"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { foldPermissions, tenantRoleSchema } from "@/lib/schemas/tenant"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { permissionsAreDeclared, ROLE_PERMISSIONS } from "@/platform/tenancy/permissions"

const ROLES = "/dashboard/roles"

async function memberCount(tenantId: string, role: string): Promise<number> {
  return db8.orm.public.Member.where({ organizationId: tenantId, role })
    .aggregate((a) => ({ n: a.count() }))
    .then((r) => r.n)
}

/**
 * Create (`existing` null) or edit a custom role ("nhóm quyền"), from the roles
 * drawer. Refuses built-in keys, malformed keys and any permission the catalog
 * does not declare (tests R2, R5). An edit keeps the key and changes the
 * permissions.
 */
export async function saveTenantRole(existing: string | null, values: unknown): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("roles", "manage")
  const t = await getTranslations("dashboard.roles.errors")
  const parsed = tenantRoleSchema({ roleKey: t("roleKey"), permissionsRequired: t("permissionsRequired") }).safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const role = existing ?? parsed.data.role
  if (role in ROLE_PERMISSIONS) return { error: t("builtIn") }

  const permission = foldPermissions(parsed.data.permissions)
  if (Object.keys(permission).length === 0 || !permissionsAreDeclared(permission)) return { error: t("unknownPermission") }

  if (existing === null) {
    await auth.api.createOrgRole({ headers: await headers(), body: { organizationId: ctx.tenantId, role, permission } })
  } else {
    await auth.api.updateOrgRole({
      headers: await headers(),
      body: { organizationId: ctx.tenantId, roleName: role, data: { permission } },
    })
  }
  revalidatePath(ROLES)
  return {}
}

/**
 * Delete custom roles, from a row or in bulk. Built-ins are undeletable, and so
 * is a role that still has members (R3, R4): those are skipped.
 */
export async function deleteTenantRoles(roles: string[]): Promise<{ deleted: number }> {
  const ctx = await requireTenantContext("roles", "manage")
  let deleted = 0
  for (const role of [...new Set(roles)].slice(0, 100)) {
    if (role in ROLE_PERMISSIONS) continue
    if ((await memberCount(ctx.tenantId, role)) > 0) continue
    await auth.api.deleteOrgRole({ headers: await headers(), body: { organizationId: ctx.tenantId, roleName: role } })
    deleted += 1
  }
  revalidatePath(ROLES)
  return { deleted }
}
