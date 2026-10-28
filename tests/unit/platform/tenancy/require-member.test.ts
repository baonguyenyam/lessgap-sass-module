import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
vi.mock("@/auth", () => ({ auth: { api: {} } }))
vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: "u1", role: "USER" }) }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))

const db = (await import("@/lib/db8")) as unknown as Db8Mock
const { resolveTenantMember, requireTenantMember } = await import("@/platform/tenancy/require-member")
const { systemContext, actingUserId } = await import("@/platform/tenancy/context")

const tenant = { id: "t1", slug: "pho", name: "Phở" }

beforeEach(() => {
  db.reset()
  db.fn("Tenant.first").mockResolvedValue(tenant)
  db.fn("Member.first").mockResolvedValue({
    id: "m1",
    organizationId: "t1",
    userId: "u1",
    role: "staff",
    status: "active",
  })
})

describe("resolveTenantMember (task 1.4)", () => {
  it("returns a member context for a member", async () => {
    const ctx = await resolveTenantMember("u1", "pho")
    expect(ctx).toMatchObject({ tenantId: "t1", actor: { kind: "member", userId: "u1", role: "staff" } })
    expect(db.call("Member.first")?.chain).toContainEqual(["where", [{ organizationId: "t1", userId: "u1" }]])
  })

  it("answers not_found for an unknown slug, a non-member and a suspended member", async () => {
    db.fn("Tenant.first").mockResolvedValueOnce(null)
    await expect(resolveTenantMember("u1", "nope")).rejects.toMatchObject({ code: "not_found" })
    db.fn("Member.first").mockResolvedValueOnce(null)
    await expect(resolveTenantMember("u2", "pho")).rejects.toMatchObject({ code: "not_found" })
    db.fn("Member.first").mockResolvedValueOnce({ id: "m1", role: "owner", status: "suspended" })
    await expect(resolveTenantMember("u1", "pho")).rejects.toMatchObject({ code: "not_found" })
  })

  it("answers forbidden when the role lacks the permission", async () => {
    await expect(resolveTenantMember("u1", "pho", "members.manage")).rejects.toMatchObject({ code: "forbidden" })
    await expect(resolveTenantMember("u1", "pho", "bookings.view")).resolves.toMatchObject({ tenantId: "t1" })
  })

  it("uses the signed-in user", async () => {
    await expect(requireTenantMember("pho")).resolves.toMatchObject({ actor: { userId: "u1" } })
  })
})

describe("systemContext", () => {
  it("names the job and has no acting user", () => {
    const ctx = systemContext("t1", "platform.tenant.delete")
    expect(ctx).toEqual({ tenantId: "t1", actor: { kind: "system", job: "platform.tenant.delete" } })
    expect(actingUserId(ctx)).toBeNull()
  })
})
