import { describe, expect, it } from "vitest"

import { foldPermissions, inviteMemberSchema, permissionKeys, tenantRoleSchema } from "@/lib/schemas/tenant"

const m = { invalidEmail: "email", roleRequired: "role", roleKey: "key", permissionsRequired: "perms" }

describe("inviteMemberSchema", () => {
  it("normalises the address and requires a role", () => {
    expect(inviteMemberSchema(m).parse({ email: " Ada@Example.COM ", role: "staff" })).toEqual({ email: "ada@example.com", role: "staff" })
    expect(inviteMemberSchema(m).safeParse({ email: "nope", role: "staff" }).error?.issues[0].message).toBe("email")
  })
})

describe("tenantRoleSchema", () => {
  it("takes a lowercase key and at least one permission", () => {
    expect(tenantRoleSchema(m).safeParse({ role: "front-desk", permissions: ["projects.view"] }).success).toBe(true)
    expect(tenantRoleSchema(m).safeParse({ role: "Front Desk", permissions: ["projects.view"] }).error?.issues[0].message).toBe("key")
    expect(tenantRoleSchema(m).safeParse({ role: "desk", permissions: [] }).error?.issues[0].message).toBe("perms")
  })
})

describe("foldPermissions / permissionKeys", () => {
  it("round-trips and drops malformed or repeated keys", () => {
    const folded = foldPermissions(["projects.view", "projects.edit", "projects.view", "bad", "a.b.c", "members.invite"])
    expect(folded).toEqual({ projects: ["view", "edit"], members: ["invite"] })
    expect(permissionKeys(folded)).toEqual(["projects.view", "projects.edit", "members.invite"])
  })
})
