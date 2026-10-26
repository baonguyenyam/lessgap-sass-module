import { createAccessControl } from "better-auth/plugins/access"

/**
 * The tenant permission catalog — every grantable action, as
 * `resource: [verbs]`; in prose each one reads `<module>.<verb>`
 * (spec/adr/0019-tenant-roles-are-permission-groups.md).
 *
 * This file is the only list of what a tenant role can do: the built-in
 * roles below are seeded from it, and custom roles ("nhóm quyền") validate
 * against it through Better Auth's `ac`. Module manifests add their
 * permissions here when the module lands, not in a second table.
 *
 * Entitlements still gate the result: granting `shop.manage` to a role does
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
  Object.entries(TENANT_PERMISSIONS).map(([resource, verbs]) => [resource, [...verbs]]),
)

/**
 * Built-in tenant roles. `owner` is also what `creatorRole` hands the tenant
 * creator and is immutable in the product (uneditable, undeletable, last one
 * undemotable). `manager` covers day-to-day operations except billing and
 * member administration. `staff` sees their own work only.
 */
export const tenantRoles = {
  owner: tenantAc.newRole(EVERYTHING),
  manager: tenantAc.newRole({
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
  }),
  staff: tenantAc.newRole({
    bookings: ["view"],
    customers: ["view"],
  }),
} as const

export const TENANT_ROLE_KEYS = Object.keys(tenantRoles) as (keyof typeof tenantRoles)[]
