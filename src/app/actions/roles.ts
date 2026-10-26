"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { permissionsAreDeclared, ROLE_PERMISSIONS } from "@/platform/tenancy/permissions"

const ROLES = "/dashboard/roles"

const roleKeySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,30}$/, "Lowercase letters, digits and hyphens")

/**
 * Form field convention: every permission checkbox is `name="perm"`
 * `value="resource.verb"`. This folds the values back into the
 * `Record<resource, verb[]>` the plugin stores.
 */
function readPermissions(formData: FormData): Record<string, string[]> {
  const permission: Record<string, string[]> = {}
  for (const value of formData.getAll("perm")) {
    const [resource, verb] = String(value).split(".")
    if (!resource || !verb) continue
    ;(permission[resource] ??= []).push(verb)
  }
  return permission
}

/**
 * Create a custom role group ("nhóm quyền"). Refuses built-in keys, malformed
 * keys and any permission the catalog does not declare (tests R2, R5).
 */
export async function createTenantRole(formData: FormData) {
  const ctx = await requireTenantContext("roles", "manage")
  const role = roleKeySchema.parse(String(formData.get("role") ?? ""))
  if (role in ROLE_PERMISSIONS) throw new Error("That name belongs to a built-in role")

  const permission = readPermissions(formData)
  if (Object.keys(permission).length === 0) throw new Error("Choose at least one permission")
  if (!permissionsAreDeclared(permission)) throw new Error("Unknown permission selected")

  await auth.api.createOrgRole({
    headers: await headers(),
    body: { organizationId: ctx.tenantId, role, permission },
  })
  revalidatePath(ROLES)
}

/** Delete a custom role. Built-ins are undeletable; a role with members is too (R3, R4). */
export async function deleteTenantRole(formData: FormData) {
  const ctx = await requireTenantContext("roles", "manage")
  const role = String(formData.get("role") ?? "")
  if (role in ROLE_PERMISSIONS) throw new Error("Built-in roles cannot be deleted")

  const users = await db8.orm.public.Member.where({ organizationId: ctx.tenantId, role })
    .aggregate((a) => ({ n: a.count() }))
    .then((r) => r.n)
  if (users > 0) throw new Error("This role still has members — move them first")

  await auth.api.deleteOrgRole({
    headers: await headers(),
    body: { organizationId: ctx.tenantId, roleName: role },
  })
  revalidatePath(ROLES)
}
