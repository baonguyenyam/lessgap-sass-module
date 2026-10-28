import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const api = { createInvitation: vi.fn(), updateMemberRole: vi.fn(), removeMember: vi.fn(), cancelInvitation: vi.fn() }
const ctx = { tenantId: "t1", user: { id: "u-me" }, member: { role: "owner", status: "active" } }
const memberCan = vi.fn()

vi.mock("@/auth", () => ({ auth: { api } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/tenancy/require-member", () => ({ requireTenantContext: async () => ctx }))
vi.mock("@/platform/tenancy/permissions", () => ({ memberCan: (...a: unknown[]) => memberCan(...a) }))
vi.mock("@/platform/tenancy/invitations", () => ({
  tenantRoleKeys: async () => ["owner", "manager", "staff", "front-desk"],
}))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { cancelMemberInvitation, inviteMember, removeMembers, setMemberRole, setMembersSuspended } =
  await import("@/app/actions/members")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  Object.values(api).forEach((fn) => fn.mockReset())
  ctx.member.role = "owner"
  memberCan.mockReset().mockResolvedValue(true)
  db.fn("OrganizationRole.all").mockResolvedValue([{ role: "front-desk" }])
  db.fn("Member.aggregate").mockResolvedValue({ n: 1 })
})

describe("inviteMember", () => {
  it("parses the form again and refuses unknown roles", async () => {
    await expect(inviteMember({ email: "nope", role: "staff" })).resolves.toEqual({ error: "invalidEmail" })
    await expect(inviteMember({ email: "a@example.com", role: "god" })).resolves.toEqual({ error: "unknownRole" })
    expect(api.createInvitation).not.toHaveBeenCalled()
  })

  it("invites with a built-in or custom role", async () => {
    await expect(inviteMember({ email: "A@Example.com", role: "front-desk" })).resolves.toEqual({})
    expect(api.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: "a@example.com", role: "front-desk", organizationId: "t1" } })
    )
  })
})

describe("inviteMember permissions (task 1.8)", () => {
  it("refuses a role that can neither invite nor manage members", async () => {
    ctx.member.role = "manager"
    memberCan.mockResolvedValue(false)
    await expect(inviteMember({ email: "a@example.com", role: "staff" })).resolves.toEqual({ error: "forbidden" })
    expect(api.createInvitation).not.toHaveBeenCalled()
  })

  it("lets a custom role with members.invite invite, but never as owner", async () => {
    ctx.member.role = "front-desk"
    memberCan.mockImplementation(async (_t: string, _r: string, _res: string, verb: string) => verb === "invite")
    await expect(inviteMember({ email: "a@example.com", role: "owner" })).resolves.toEqual({ error: "ownerOnly" })
    await expect(inviteMember({ email: "a@example.com", role: "staff" })).resolves.toEqual({})
    expect(api.createInvitation).toHaveBeenCalledOnce()
  })

  it("clears an old answered invitation for the address, then invites", async () => {
    await inviteMember({ email: "a@example.com", role: "staff" })
    expect(db.fn("Invitation.delete")).toHaveBeenCalled()
  })

  it("turns the plugin's 'already invited' and 'already a member' into messages", async () => {
    api.createInvitation.mockRejectedValueOnce({ body: { code: "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION" } })
    await expect(inviteMember({ email: "a@example.com", role: "staff" })).resolves.toEqual({ error: "alreadyInvited" })
    api.createInvitation.mockRejectedValueOnce({ body: { code: "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION" } })
    await expect(inviteMember({ email: "a@example.com", role: "staff" })).resolves.toEqual({ error: "alreadyMember" })
    api.createInvitation.mockRejectedValueOnce(new Error("boom"))
    await expect(inviteMember({ email: "a@example.com", role: "staff" })).rejects.toThrow("boom")
  })
})

describe("setMemberRole", () => {
  it("lets only an owner change an owner's role or make an owner", async () => {
    ctx.member.role = "front-desk"
    db.fn("Member.first").mockResolvedValue({ id: "m3", role: "owner", userId: "u3" })
    await expect(setMemberRole("m3", "staff")).resolves.toEqual({ error: "ownerOnly" })
    db.fn("Member.first").mockResolvedValue({ id: "m4", role: "staff", userId: "u4" })
    await expect(setMemberRole("m4", "owner")).resolves.toEqual({ error: "ownerOnly" })
    expect(api.updateMemberRole).not.toHaveBeenCalled()
  })

  it("never demotes the last owner", async () => {
    db.fn("Member.first").mockResolvedValue({ id: "m1", role: "owner", userId: "u2" })
    await expect(setMemberRole("m1", "staff")).resolves.toEqual({ error: "lastOwner" })
    expect(api.updateMemberRole).not.toHaveBeenCalled()
  })

  it("changes a member's role inside the tenant only", async () => {
    db.fn("Member.first").mockResolvedValue({ id: "m2", role: "staff", userId: "u2" })
    await expect(setMemberRole("m2", "manager")).resolves.toEqual({})
    expect(db.call("Member.first")?.chain).toEqual([["where", [{ id: "m2", organizationId: "t1" }]]])
    expect(api.updateMemberRole).toHaveBeenCalledWith(
      expect.objectContaining({ body: { memberId: "m2", role: "manager" } })
    )
  })
})

describe("removeMembers", () => {
  it("skips the caller and the last owner, and removes the rest", async () => {
    db.fn("Member.all").mockResolvedValue([
      { id: "m-me", role: "owner", userId: "u-me" },
      { id: "m-owner", role: "owner", userId: "u2" },
      { id: "m-staff", role: "staff", userId: "u3" },
    ])
    db.fn("Member.aggregate").mockResolvedValue({ n: 1 })
    await expect(removeMembers(["m-me", "m-owner", "m-staff"])).resolves.toEqual({ removed: 1 })
    expect(api.removeMember).toHaveBeenCalledTimes(1)
    expect(api.removeMember).toHaveBeenCalledWith(expect.objectContaining({ body: { memberIdOrEmail: "m-staff" } }))
  })
})

describe("setMembersSuspended", () => {
  it("never suspends the caller or an owner, and stays inside the tenant", async () => {
    db.fn("Member.all").mockResolvedValue([
      { id: "m-me", role: "manager", userId: "u-me" },
      { id: "m-owner", role: "owner", userId: "u2" },
      { id: "m-staff", role: "staff", userId: "u3" },
    ])
    db.fn("Member.updateAndCount").mockResolvedValue(1)
    await expect(setMembersSuspended(["m-me", "m-owner", "m-staff"], true)).resolves.toEqual({ changed: 1 })
    const update = db.call("Member.updateAndCount")
    expect(update?.chain[0]).toEqual(["where", [{ organizationId: "t1" }]])
    expect(update?.args).toEqual([{ status: "suspended" }])
  })

  it("does nothing when only protected members are picked", async () => {
    db.fn("Member.all").mockResolvedValue([{ id: "m-owner", role: "owner", userId: "u2" }])
    await expect(setMembersSuspended(["m-owner"], true)).resolves.toEqual({ changed: 0 })
    expect(db.call("Member.updateAndCount")).toBeUndefined()
  })
})

describe("cancelMemberInvitation", () => {
  it("only cancels a pending invitation of this tenant", async () => {
    db.fn("Invitation.first").mockResolvedValue(null)
    await expect(cancelMemberInvitation("i-other")).resolves.toEqual({ error: "notFound" })
    expect(api.cancelInvitation).not.toHaveBeenCalled()

    db.fn("Invitation.first").mockResolvedValue({ id: "i1" })
    await expect(cancelMemberInvitation("i1")).resolves.toEqual({})
    expect(db.call("Invitation.first")?.chain).toEqual([
      ["where", [{ id: "i1", organizationId: "t1", status: "pending" }]],
    ])
    expect(api.cancelInvitation).toHaveBeenCalledWith(expect.objectContaining({ body: { invitationId: "i1" } }))
  })
})
