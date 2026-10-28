import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const api = { createOrgRole: vi.fn(), updateOrgRole: vi.fn(), deleteOrgRole: vi.fn() }

vi.mock("@/auth", () => ({ auth: { api } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/tenancy/require-member", () => ({
  requireTenantContext: async () => ({ tenantId: "t1", user: { id: "u-me" } }),
}))
vi.mock("@/platform/tenancy/permissions", () => ({
  ROLE_PERMISSIONS: { owner: {}, manager: {}, staff: {} },
  permissionsAreDeclared: (p: Record<string, string[]>) => Object.keys(p).every((r) => r === "projects"),
  withPluginGrants: (p: Record<string, string[]>) => p,
}))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
const entitlements = { custom: true, max: 10 as number | null }
vi.mock("@/platform/entitlements", () => ({
  getEntitlements: async () => ({ has: () => entitlements.custom, limit: () => entitlements.max }),
}))

const { deleteTenantRoles, saveTenantRole } = await import("@/app/actions/roles")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  Object.values(api).forEach((fn) => fn.mockReset())
  entitlements.custom = true
  entitlements.max = 10
  db.fn("OrganizationRole.aggregate").mockResolvedValue({ n: 0 })
})

describe("custom roles as a feature (task 1.8b)", () => {
  it("refuses to save or delete when roles.custom is off", async () => {
    entitlements.custom = false
    await expect(saveTenantRole(null, { role: "desk", permissions: ["projects.view"] })).resolves.toEqual({
      error: "featureUnavailable",
    })
    await expect(deleteTenantRoles(["desk"])).resolves.toEqual({ deleted: 0 })
    expect(api.createOrgRole).not.toHaveBeenCalled()
    expect(api.deleteOrgRole).not.toHaveBeenCalled()
  })

  it("refuses a new role past roles.max, but still edits an existing one", async () => {
    entitlements.max = 2
    db.fn("OrganizationRole.aggregate").mockResolvedValue({ n: 2 })
    await expect(saveTenantRole(null, { role: "desk", permissions: ["projects.view"] })).resolves.toEqual({
      error: "limitReached",
    })
    await expect(saveTenantRole("desk", { role: "desk", permissions: ["projects.view"] })).resolves.toEqual({})
    expect(api.createOrgRole).not.toHaveBeenCalled()
    expect(api.updateOrgRole).toHaveBeenCalledOnce()
  })
})

describe("saveTenantRole", () => {
  it("refuses built-in names, bad keys and undeclared permissions", async () => {
    await expect(saveTenantRole(null, { role: "owner", permissions: ["projects.view"] })).resolves.toEqual({
      error: "builtIn",
    })
    await expect(saveTenantRole(null, { role: "Front Desk", permissions: ["projects.view"] })).resolves.toEqual({
      error: "roleKey",
    })
    await expect(saveTenantRole(null, { role: "desk", permissions: ["billing.manage"] })).resolves.toEqual({
      error: "unknownPermission",
    })
    expect(api.createOrgRole).not.toHaveBeenCalled()
  })

  it("creates a new role and edits an existing one by its key", async () => {
    await expect(saveTenantRole(null, { role: "desk", permissions: ["projects.view"] })).resolves.toEqual({})
    expect(api.createOrgRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: { organizationId: "t1", role: "desk", permission: { projects: ["view"] } } })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        actorId: "u-me",
        actorKind: "member",
        action: "tenancy.role.created",
        targetType: "role",
        targetId: "desk",
        data: { permission: { projects: ["view"] } },
      })
    )
    await expect(saveTenantRole("desk", { role: "renamed", permissions: ["projects.edit"] })).resolves.toEqual({})
    expect(api.updateOrgRole).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { organizationId: "t1", roleName: "desk", data: { permission: { projects: ["edit"] } } },
      })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "tenancy.role.updated", targetId: "desk" })
    )
  })
})

describe("deleteTenantRoles", () => {
  it("skips built-ins and roles that still have members", async () => {
    db.fn("Member.aggregate").mockResolvedValueOnce({ n: 2 }).mockResolvedValueOnce({ n: 0 })
    await expect(deleteTenantRoles(["owner", "busy", "empty"])).resolves.toEqual({ deleted: 1 })
    expect(api.deleteOrgRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: { organizationId: "t1", roleName: "empty" } })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledTimes(1)
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({ action: "tenancy.role.deleted", targetType: "role", targetId: "empty" })
    )
  })
})
