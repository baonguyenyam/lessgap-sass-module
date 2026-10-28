import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

// Task 1.3: a custom role created through the plugin may only use declared permissions.
async function signedInOwner() {
  const email = `owner-${Date.now()}@example.test`
  const { headers, response } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: "Owner" },
    returnHeaders: true,
  })
  const cookie = headers.get("set-cookie")!.split(";")[0]
  const session = new Headers({ cookie })
  const tenant = await auth.api.createOrganization({
    body: { name: "Roles Tenant", slug: `roles-${Date.now()}` },
    headers: session,
  })
  return { session, tenantId: tenant!.id, userId: response.user.id }
}

describe("custom roles through the plugin", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("stores a role made of declared permissions", async () => {
    const { session, tenantId } = await signedInOwner()
    await auth.api.createOrgRole({
      body: { organizationId: tenantId, role: "front-desk", permission: { bookings: ["view", "manage"] } },
      headers: session,
    })
    const row = await db8.orm.public.OrganizationRole.where({ organizationId: tenantId, role: "front-desk" }).first()
    expect(row?.permission).toEqual({ bookings: ["view", "manage"] })
  })

  it("refuses an undeclared resource and an undeclared verb", async () => {
    const { session, tenantId } = await signedInOwner()
    await expect(
      auth.api.createOrgRole({
        body: { organizationId: tenantId, role: "pilot", permission: { spaceships: ["launch"] } },
        headers: session,
      })
    ).rejects.toThrow()
    await expect(
      auth.api.createOrgRole({
        body: { organizationId: tenantId, role: "deleter", permission: { bookings: ["delete"] } },
        headers: session,
      })
    ).rejects.toThrow()
    expect(await db8.orm.public.OrganizationRole.where({ organizationId: tenantId }).all()).toHaveLength(0)
  })
})
