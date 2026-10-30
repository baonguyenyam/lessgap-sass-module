import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

import {
  catalogPermissions,
  DECLARED_PERMISSIONS,
  groupedCatalog,
  PERMISSION_GROUPS,
  TENANT_PERMISSIONS,
  grantedPermissions,
  memberCan,
  permissionsAreDeclared,
  roleGrants,
  TENANT_ROLE_KEYS,
  withPluginGrants,
  type TenantPermission,
} from "@/platform/tenancy/permissions"

// What each built-in role may do (task 1.3). Changing a grant changes this table on purpose.
const EXPECTED: Record<string, TenantPermission[]> = {
  owner: DECLARED_PERMISSIONS,
  manager: [
    "members.view",
    "roles.view",
    "settings.manage",
    "site.manage",
    "pages.manage",
    "media.manage",
    "catalog.view",
    "catalog.manage",
    "team.view",
    "team.manage",
    "bookings.view",
    "bookings.manage",
    "orders.view",
    "orders.manage",
    "quotes.view",
    "quotes.manage",
    "customers.view",
    "customers.manage",
    "chatbot.view",
    "chatbot.manage",
    "notifications.manage",
    "newsletter.view",
    "newsletter.manage",
    "reports.view",
  ],
  staff: ["bookings.view", "customers.view"],
}

describe("built-in role grants", () => {
  it("declares exactly the built-in roles", () => {
    expect(TENANT_ROLE_KEYS.sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  const pairs = TENANT_ROLE_KEYS.flatMap((role) =>
    DECLARED_PERMISSIONS.map((permission) => [role, permission] as const)
  )
  it.each(pairs)("%s → %s", async (role, permission) => {
    const [resource, verb] = permission.split(".") as [never, never]
    const expected = EXPECTED[role].includes(permission)
    expect(await memberCan("t1", role, resource, verb)).toBe(expected)
    expect(roleGrants(role).includes(permission)).toBe(expected)
  })

  it("keeps billing and member administration with the owner", () => {
    for (const permission of ["billing.manage", "members.invite", "members.manage", "roles.manage"] as const) {
      expect(roleGrants("manager")).not.toContain(permission)
      expect(roleGrants("staff")).not.toContain(permission)
    }
  })
})

describe("declared permissions", () => {
  it("refuses an undeclared resource or verb in a custom role", () => {
    expect(permissionsAreDeclared({ bookings: ["view"], orders: ["manage"] })).toBe(true)
    expect(permissionsAreDeclared({ spaceships: ["launch"] })).toBe(false)
    expect(permissionsAreDeclared({ bookings: ["delete"] })).toBe(false)
  })

  it("makes an unknown permission a type error", async () => {
    // @ts-expect-error: "launch" is not a declared verb of bookings.
    await memberCan("t1", "owner", "bookings", "launch")
    // @ts-expect-error: "spaceships" is not a declared resource.
    await memberCan("t1", "owner", "spaceships", "view")
    // @ts-expect-error: not a TenantPermission.
    const nope: TenantPermission = "bookings.launch"
    expect(nope).toBeDefined()
  })
})

describe("plugin statements", () => {
  it("derives what the organization plugin checks from the product permissions", () => {
    expect(withPluginGrants({ members: ["invite"] })).toEqual({ members: ["invite"], invitation: ["create", "cancel"] })
    expect(withPluginGrants({ members: ["manage"], roles: ["manage"], settings: ["manage"] })).toEqual({
      members: ["manage"],
      roles: ["manage"],
      settings: ["manage"],
      invitation: ["create", "cancel"],
      member: ["create", "update", "delete"],
      ac: ["create", "read", "update", "delete"],
      organization: ["update"],
    })
    expect(withPluginGrants({ bookings: ["view"] })).toEqual({ bookings: ["view"] })
  })

  it("never lets a plugin statement through to the catalog view", () => {
    expect(catalogPermissions({ bookings: ["view", "delete"], ac: ["create"], member: ["delete"] })).toEqual({
      bookings: ["view"],
    })
  })
})

describe("permission groups (task 1.8b)", () => {
  it("puts every resource of the catalog in exactly one group", () => {
    const grouped = Object.values(PERMISSION_GROUPS).flat()
    expect([...grouped].sort()).toEqual(Object.keys(TENANT_PERMISSIONS).sort())
    expect(new Set(grouped).size).toBe(grouped.length)
  })

  it("lists each group's resources with the verbs the catalog declares", () => {
    const workspace = groupedCatalog().find((g) => g.group === "workspace")!
    expect(workspace.resources[0]).toEqual({ resource: "members", verbs: ["view", "invite", "manage"] })
  })
})

describe("grantedPermissions (the menu's view of a role)", () => {
  it("answers a built-in role from the table, without a read", async () => {
    expect(await grantedPermissions("t1", "staff")).toEqual(roleGrants("staff"))
  })

  it("reads a custom role once and keeps only declared permissions", async () => {
    const db = (await import("@/lib/db8")) as unknown as import("@tests/helpers/db8-mock").Db8Mock
    db.fn("OrganizationRole.first").mockResolvedValueOnce({
      permission: { bookings: ["view"], invitation: ["create"], spaceships: ["launch"] },
    })
    expect(await grantedPermissions("t1", "front-desk")).toEqual(["bookings.view"])
    db.fn("OrganizationRole.first").mockResolvedValueOnce(null)
    expect(await grantedPermissions("t1", "gone")).toEqual([])
  })
})

describe("roles page labels", () => {
  // The roles page names every group, resource and verb of the catalog; a key
  // added here without its label throws MISSING_MESSAGE on that page.
  it("has an English label for every permission group, resource and verb", async () => {
    const en = (await import("@/locales/en.json")).default as {
      dashboard: {
        roles: { groups: Record<string, string>; resources: Record<string, string>; verbs: Record<string, string> }
      }
    }
    const { groups, resources, verbs } = en.dashboard.roles
    for (const group of Object.keys(PERMISSION_GROUPS)) expect(groups, group).toHaveProperty([group])
    for (const [resource, resourceVerbs] of Object.entries(TENANT_PERMISSIONS)) {
      expect(resources, resource).toHaveProperty([resource])
      for (const verb of resourceVerbs) expect(verbs, verb).toHaveProperty([verb])
    }
  })
})
