import { createAccessControl } from "better-auth/plugins/access"
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
  reports: ["view"],
} as const

export const tenantAc = createAccessControl(TENANT_PERMISSIONS)

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
export const ROLE_PERMISSIONS: Record<string, Record<string, readonly string[]>> = {
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
    reports: ["view"],
  },
  staff: {
    bookings: ["view"],
    customers: ["view"],
  },
}

export const tenantRoles = Object.fromEntries(
  Object.entries(ROLE_PERMISSIONS).map(([key, grants]) => [key, tenantAc.newRole({ ...grants })])
)

export const TENANT_ROLE_KEYS = Object.keys(ROLE_PERMISSIONS)

/** Every `resource:verb` pair the catalog declares, for form UIs. */
export const DECLARED_PERMISSIONS: string[] = Object.entries(TENANT_PERMISSIONS).flatMap(([resource, verbs]) =>
  verbs.map((verb) => `${resource}.${verb}`)
)

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
export async function memberCan(
  organizationId: string,
  roleKey: string,
  resource: keyof typeof TENANT_PERMISSIONS,
  verb: string
): Promise<boolean> {
  const grants = ROLE_PERMISSIONS[roleKey]
  if (grants) return grants[resource]?.includes(verb) ?? false
  const row = await db8.orm.public.OrganizationRole.where({ organizationId, role: roleKey }).first()
  const permission = row?.permission as Record<string, string[]> | null | undefined
  return permission?.[resource]?.includes(verb) ?? false
}
