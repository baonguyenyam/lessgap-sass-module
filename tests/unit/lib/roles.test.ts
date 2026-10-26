import { describe, expect, it } from "vitest"

import { ASSIGNABLE_ROLES, ROLES, canChangeRole, canSwitchAs, isAdmin, isRole, isRoot} from "@/lib/roles"

describe("isAdmin / isRoot", () => {
  it.each([
    ["USER", false, false],
    ["ADMIN", true, false],
    ["ROOT", true, true],
  ] as const)("%s → admin %s, root %s", (role, admin, root) => {
    expect(isAdmin(role)).toBe(admin)
    expect(isRoot(role)).toBe(root)
  })

  it("treats a missing role as neither", () => {
    expect(isAdmin(undefined)).toBe(false)
    expect(isRoot(null)).toBe(false)
  })
})

describe("isRole", () => {
  it("accepts the three roles and nothing else", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true)
    for (const value of ["root", "OWNER", "", null, 1]) expect(isRole(value)).toBe(false)
  })
})

describe("canChangeRole", () => {
  it("lets ROOT promote and demote between USER and ADMIN", () => {
    expect(canChangeRole("ROOT", "USER", "ADMIN")).toBe(true)
    expect(canChangeRole("ROOT", "ADMIN", "USER")).toBe(true)
  })

  it("never lets anyone grant or take away ROOT from the UI", () => {
    expect(canChangeRole("ROOT", "USER", "ROOT")).toBe(false)
    expect(canChangeRole("ROOT", "ROOT", "ADMIN")).toBe(false)
    expect(ASSIGNABLE_ROLES).not.toContain("ROOT")
  })

  it("refuses everyone below ROOT, admins included", () => {
    expect(canChangeRole("ADMIN", "USER", "ADMIN")).toBe(false)
    expect(canChangeRole("USER", "USER", "ADMIN")).toBe(false)
  })

  it("refuses a change to the role already held", () => {
    expect(canChangeRole("ROOT", "ADMIN", "ADMIN")).toBe(false)
  })
})

describe("canSwitchAs", () => {
  const root = { id: "r1", role: "ROOT" as const, switched: false }

  it("lets ROOT switch to a user or an admin", () => {
    expect(canSwitchAs(root, { id: "u1", role: "USER" })).toBe(true)
    expect(canSwitchAs(root, { id: "a1", role: "ADMIN" })).toBe(true)
  })

  it("refuses anyone who is not ROOT", () => {
    for (const role of ["USER", "ADMIN"] as const) {
      expect(canSwitchAs({ id: "x", role, switched: false }, { id: "u1", role: "USER" })).toBe(false)
    }
  })

  it("never switches onto a ROOT account or onto yourself", () => {
    expect(canSwitchAs(root, { id: "r2", role: "ROOT" })).toBe(false)
    expect(canSwitchAs({ ...root, role: "ROOT" }, { id: "r1", role: "USER" })).toBe(false)
  })

  it("refuses to chain a switch from a session that is already switched", () => {
    expect(canSwitchAs({ ...root, switched: true }, { id: "u1", role: "USER" })).toBe(false)
  })
})
