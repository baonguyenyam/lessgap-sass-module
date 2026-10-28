import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { findInvitation, tenantRoleKeys } from "@/platform/tenancy/invitations"
import { resetDatabase } from "@tests/helpers/db"

// Task 1.8: invitations through the organization plugin, with real sessions.
// Every email is replaced (they render with next-intl, which needs a request,
// and none should leave a test); the invitation one is checked.
const sendTenantInvitationEmail = vi.hoisted(() => vi.fn())
vi.mock("@/lib/email", async (importOriginal) => ({
  ...Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)])),
  sendTenantInvitationEmail,
}))
let seq = 0
async function signUp(email = `person-${Date.now()}-${++seq}@example.test`) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: email.split("@")[0] },
    returnHeaders: true,
  })
  return { session: new Headers({ cookie: headers.get("set-cookie")!.split(";")[0] }), userId: response.user.id, email }
}

async function tenantWithOwner() {
  const owner = await signUp()
  const tenant = await auth.api.createOrganization({
    body: { name: "Invite Tenant", slug: `invite-${Date.now()}-${++seq}` },
    headers: owner.session,
  })
  return { owner, tenantId: tenant!.id }
}

describe("invitations (task 1.8)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("lets the owner invite, and refuses a manager, who cannot invite", { timeout: 30_000 }, async () => {
    const { owner, tenantId } = await tenantWithOwner()
    const manager = await signUp()
    // The plugin's types know only its default roles; "manager" is one of ours.
    await auth.api.addMember({
      body: { userId: manager.userId, organizationId: tenantId, role: "manager" as "member" },
    })

    await expect(
      auth.api.createInvitation({
        headers: manager.session,
        body: { email: "nope@example.test", role: "staff", organizationId: tenantId },
      })
    ).rejects.toThrow()
    await auth.api.createInvitation({
      headers: owner.session,
      body: { email: "new@example.test", role: "staff", organizationId: tenantId },
    })
    const rows = await db8.orm.public.Invitation.where({ organizationId: tenantId }).all()
    expect(rows.map((r) => r.email)).toEqual(["new@example.test"])
    await vi.waitFor(() =>
      expect(sendTenantInvitationEmail).toHaveBeenCalledWith(
        "new@example.test",
        expect.objectContaining({
          tenant: "Invite Tenant",
          role: "staff",
          url: expect.stringContaining(`/invite/${rows[0].id}`),
        })
      )
    )
  })

  it("joins with the invited role, a custom one included", { timeout: 30_000 }, async () => {
    const { owner, tenantId } = await tenantWithOwner()
    await auth.api.createOrgRole({
      headers: owner.session,
      body: { organizationId: tenantId, role: "front-desk", permission: { bookings: ["view"] } },
    })
    expect(await tenantRoleKeys(tenantId)).toEqual(["owner", "manager", "staff", "front-desk"])

    const invitee = await signUp()
    const invitation = await auth.api.createInvitation({
      headers: owner.session,
      body: { email: invitee.email, role: "front-desk", organizationId: tenantId },
    })
    expect((await findInvitation(invitation.id))?.state).toBe("pending")
    await auth.api.acceptInvitation({ headers: invitee.session, body: { invitationId: invitation.id } })

    const member = await db8.orm.public.Member.where({ organizationId: tenantId, userId: invitee.userId }).first()
    expect(member?.role).toBe("front-desk")
    expect((await findInvitation(invitation.id))?.state).toBe("accepted")
  })

  it("refuses an expired invitation", { timeout: 30_000 }, async () => {
    const { owner, tenantId } = await tenantWithOwner()
    const invitee = await signUp()
    const invitation = await auth.api.createInvitation({
      headers: owner.session,
      body: { email: invitee.email, role: "staff", organizationId: tenantId },
    })
    await db8.orm.public.Invitation.where({ id: invitation.id }).update({
      expiresAt: toTs(new Date(Date.now() - 60_000)),
    })

    expect((await findInvitation(invitation.id))?.state).toBe("expired")
    await expect(
      auth.api.acceptInvitation({ headers: invitee.session, body: { invitationId: invitation.id } })
    ).rejects.toThrow()
    expect(await db8.orm.public.Member.where({ organizationId: tenantId, userId: invitee.userId }).first()).toBeNull()
  })

  it("refuses an invitation accepted by another address", { timeout: 30_000 }, async () => {
    const { owner, tenantId } = await tenantWithOwner()
    const stranger = await signUp()
    const invitation = await auth.api.createInvitation({
      headers: owner.session,
      body: { email: "someone-else@example.test", role: "staff", organizationId: tenantId },
    })
    await expect(
      auth.api.acceptInvitation({ headers: stranger.session, body: { invitationId: invitation.id } })
    ).rejects.toThrow()
  })
})
