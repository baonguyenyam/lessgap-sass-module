import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/organization/access"
import { db8 } from "@/lib/db8"

/**
 * The tenant permission catalog — every grantable action, as
 * `resource: [verbs]`; in prose each one reads `<module>.<verb>`
 * (spec/adr/0019-tenant-roles-are-permission-groups.md).
 *
 * This file is the only list of what a tenant role can do: the built-in
 * roles below are seeded from it, and custom roles ("nhóm quyền") validate
 * against it through `permissionsAreDeclared`. Module manifests add their
 * permissions here when the module lands, not in a second table.
 *
 * Entitlements still gate the result: granting `orders.manage` to a role does
 * not help a tenant whose plan has no shop — the check is
 * `(entitlement) AND (role permission)`.
 */
export const TENANT_PERMISSIONS = {
  members: ["view", "invite", "manage"],
  roles: ["view", "manage"],
  settings: ["manage"],
  billing: ["manage"],
  site: ["manage"],
  pages: ["manage"],
  media: ["manage"],
  catalog: ["view", "manage"],
  bookings: ["view", "manage"],
  orders: ["view", "manage"],
  quotes: ["view", "manage"],
  customers: ["view", "manage"],
  chatbot: ["view", "manage"],
  notifications: ["manage"],
  newsletter: ["view", "manage"],
  reports: ["view"],
} as const

export type TenantResource = keyof typeof TENANT_PERMISSIONS

/**
 * How the roles page groups the catalog, one heading per area (task 1.8b).
 * Every resource sits in exactly one group (tested); a module adds its own
 * group when it lands.
 */
export const PERMISSION_GROUPS = {
  workspace: ["members", "roles", "settings", "billing", "notifications"],
  website: ["site", "pages", "media"],
  bookings: ["bookings", "customers"],
  sales: ["catalog", "orders", "quotes"],
  marketing: ["newsletter", "chatbot"],
  insights: ["reports"],
} as const satisfies Record<string, readonly TenantResource[]>

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS

/** The catalog in display order: each group with its resources and their verbs. */
export function groupedCatalog(): Array<{
  group: PermissionGroupKey
  resources: Array<{ resource: TenantResource; verbs: string[] }>
}> {
  return (Object.entries(PERMISSION_GROUPS) as [PermissionGroupKey, readonly TenantResource[]][]).map(
    ([group, resources]) => ({
      group,
      resources: resources.map((resource) => ({ resource, verbs: [...TENANT_PERMISSIONS[resource]] })),
    })
  )
}
export type TenantVerb<R extends TenantResource> = (typeof TENANT_PERMISSIONS)[R][number]
/** Every declared permission as `<resource>.<verb>`; anything else is a type error. */
export type TenantPermission = { [R in TenantResource]: `${R}.${TenantVerb<R>}` }[TenantResource]
/** A grant map that only names declared verbs. */
export type RoleGrants = { readonly [R in TenantResource]?: readonly TenantVerb<R>[] }

/**
 * The statements the Better Auth organization plugin checks on its own calls:
 * `invitation` (invite), `member` (add, change, remove), `ac` (custom roles),
 * `organization` (rename). They are not product permissions and never appear
 * in a form; `withPluginGrants` derives them from the catalog, so the catalog
 * stays the only list a person edits.
 */
export const tenantAc = createAccessControl({ ...defaultStatements, ...TENANT_PERMISSIONS })

/**
 * A grant map with the plugin statements its product permissions imply:
 * `members.invite` → may invite; `members.manage` → may invite and change or
 * remove members; `roles.view` / `roles.manage` → may read / edit custom
 * roles; `settings.manage` → may rename the tenant. Used for the built-in
 * roles below and for every custom role before it is stored.
 */
export function withPluginGrants(grants: {
  readonly [resource: string]: readonly string[] | undefined
}): Record<string, string[]> {
  const out: Record<string, string[]> = Object.fromEntries(
    Object.entries(grants).map(([resource, verbs]) => [resource, [...(verbs ?? [])]])
  )
  const has = (resource: string, verb: string) => grants[resource]?.includes(verb) ?? false
  const add = (resource: string, verbs: string[]) => {
    out[resource] = [...new Set([...(out[resource] ?? []), ...verbs])]
  }
  if (has("members", "invite") || has("members", "manage")) add("invitation", ["create", "cancel"])
  if (has("members", "manage")) add("member", ["create", "update", "delete"])
  if (has("roles", "view")) add("ac", ["read"])
  if (has("roles", "manage")) add("ac", ["create", "read", "update", "delete"])
  if (has("settings", "manage")) add("organization", ["update"])
  return out
}

/** The catalog part of a stored permission map, without the plugin statements. */
export function catalogPermissions(permission: Record<string, readonly string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(permission)
      .filter(([resource]) => resource in TENANT_PERMISSIONS)
      .map(([resource, verbs]) => [
        resource,
        verbs.filter((verb) => (TENANT_PERMISSIONS[resource as TenantResource] as readonly string[]).includes(verb)),
      ])
  )
}

const EVERYTHING = Object.fromEntries(
  Object.entries(TENANT_PERMISSIONS).map(([resource, verbs]) => [resource, [...verbs]])
)

/**
 * What each built-in role grants. This map is read twice — once to build the
 * Better Auth `roles` below and once at request time by `memberCan` — so the
 * two can never drift.
 *
 * `owner` gets everything and is immutable in the product. `manager` covers
 * day-to-day operations except billing and member administration. `staff`
 * sees their own work only.
 */
export const ROLE_PERMISSIONS: Record<string, RoleGrants> = {
  owner: EVERYTHING,
  manager: {
    members: ["view"],
    roles: ["view"],
    settings: ["manage"],
    site: ["manage"],
    pages: ["manage"],
    media: ["manage"],
    catalog: ["view", "manage"],
    bookings: ["view", "manage"],
    orders: ["view", "manage"],
    quotes: ["view", "manage"],
    customers: ["view", "manage"],
    chatbot: ["view", "manage"],
    notifications: ["manage"],
    newsletter: ["view", "manage"],
    reports: ["view"],
  },
  staff: {
    bookings: ["view"],
    customers: ["view"],
  },
}

export const tenantRoles = Object.fromEntries(
  Object.entries(ROLE_PERMISSIONS).map(([key, grants]) => [
    key,
    tenantAc.newRole(withPluginGrants(grants) as Parameters<typeof tenantAc.newRole>[0]),
  ])
)

export const TENANT_ROLE_KEYS = Object.keys(ROLE_PERMISSIONS)

/** Every `resource:verb` pair the catalog declares, for form UIs. */
export const DECLARED_PERMISSIONS = Object.entries(TENANT_PERMISSIONS).flatMap(([resource, verbs]) =>
  verbs.map((verb) => `${resource}.${verb}`)
) as TenantPermission[]

/** The permissions a built-in role grants, as `<resource>.<verb>`. */
export function roleGrants(roleKey: string): TenantPermission[] {
  const grants = ROLE_PERMISSIONS[roleKey] ?? {}
  return Object.entries(grants).flatMap(([resource, verbs]) =>
    (verbs ?? []).map((verb) => `${resource}.${verb}` as TenantPermission)
  )
}

/**
 * Whether a permission map (resource → verbs) only uses verbs the catalog
 * declares. Custom roles submitted by owners go through this before they are
 * stored (test R2: undeclared permissions are refused).
 */
export function permissionsAreDeclared(permission: Record<string, string[]>): boolean {
  return Object.entries(permission).every(
    ([resource, verbs]) =>
      resource in TENANT_PERMISSIONS &&
      verbs.every((verb) =>
        (TENANT_PERMISSIONS[resource as keyof typeof TENANT_PERMISSIONS] as readonly string[]).includes(verb)
      )
  )
}

/**
 * Whether `roleKey` grants `resource.verb` inside `organizationId`. Built-in
 * roles resolve from ROLE_PERMISSIONS; anything else is a custom role, read
 * from its OrganizationRole row. Unknown roles grant nothing.
 */
export async function memberCan<R extends TenantResource>(
  organizationId: string,
  roleKey: string,
  resource: R,
  verb: TenantVerb<R>
): Promise<boolean> {
  const grants = ROLE_PERMISSIONS[roleKey]
  if (grants) return (grants[resource] as readonly string[] | undefined)?.includes(verb) ?? false
  const row = await db8.orm.public.OrganizationRole.where({ organizationId, role: roleKey }).first()
  const permission = row?.permission as Record<string, string[]> | null | undefined
  return permission?.[resource]?.includes(verb) ?? false
}
