import { z } from "zod"

/**
 * Tenant members and roles, for the drawers in the browser and the server
 * actions, which parse again. Messages come from the caller's translations.
 */
export type InviteMessages = { invalidEmail: string; roleRequired: string }

export function inviteMemberSchema(m: InviteMessages) {
  return z.object({
    email: z.string().trim().toLowerCase().email(m.invalidEmail),
    role: z.string().min(1, m.roleRequired),
  })
}
export type InviteMemberInput = z.infer<ReturnType<typeof inviteMemberSchema>>

/** A role key: lowercase letters, digits and hyphens, starting with a letter or digit. */
export const ROLE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}$/

export type RoleMessages = { roleKey: string; permissionsRequired: string }

export function tenantRoleSchema(m: RoleMessages) {
  return z.object({
    role: z.string().trim().regex(ROLE_KEY_PATTERN, m.roleKey),
    /** `resource.verb` keys, one per checked permission. */
    permissions: z.array(z.string()).min(1, m.permissionsRequired),
  })
}
export type TenantRoleInput = z.infer<ReturnType<typeof tenantRoleSchema>>

/** `["projects.view", "projects.edit"]` → `{ projects: ["view", "edit"] }`. */
export function foldPermissions(keys: string[]): Record<string, string[]> {
  const permission: Record<string, string[]> = {}
  for (const key of keys) {
    const [resource, verb, extra] = key.split(".")
    if (!resource || !verb || extra !== undefined) continue
    const verbs = (permission[resource] ??= [])
    if (!verbs.includes(verb)) verbs.push(verb)
  }
  return permission
}

/** The reverse of `foldPermissions`. */
export function permissionKeys(permission: Record<string, readonly string[]>): string[] {
  return Object.entries(permission).flatMap(([resource, verbs]) => verbs.map((verb) => `${resource}.${verb}`))
}
