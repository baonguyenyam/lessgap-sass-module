import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const api = { createOrgRole: vi.fn(), updateOrgRole: vi.fn(), deleteOrgRole: vi.fn() }

vi.mock("@/auth", () => ({ auth: { api } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/tenancy/require-member", () => ({ requireTenantContext: async () => ({ tenantId: "t1" }) }))
vi.mock("@/platform/tenancy/permissions", () => ({
  ROLE_PERMISSIONS: { owner: {}, manager: {}, staff: {} },
  permissionsAreDeclared: (p: Record<string, string[]>) => Object.keys(p).every((r) => r === "projects"),
}))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { deleteTenantRoles, saveTenantRole } = await import("@/app/actions/roles")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  Object.values(api).forEach((fn) => fn.mockReset())
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
    await expect(saveTenantRole("desk", { role: "renamed", permissions: ["projects.edit"] })).resolves.toEqual({})
    expect(api.updateOrgRole).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { organizationId: "t1", roleName: "desk", data: { permission: { projects: ["edit"] } } },
      })
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
  })
})
