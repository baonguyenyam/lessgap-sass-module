import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resolveTenantMember } from "@/platform/tenancy/require-member"
import { resetDatabase } from "@tests/helpers/db"

// Task 1.10: staff-created tenants and suspension. Emails are all stubbed.
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

let seq = 0
async function signUp(email = `person-${Date.now()}-${++seq}@example.test`) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: email.split("@")[0] },
    returnHeaders: true,
  })
  return { session: new Headers({ cookie: headers.get("set-cookie")!.split(";")[0] }), userId: response.user.id }
}

describe("platform console (task 1.10)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("lets staff create a tenant for another user, who becomes its owner", { timeout: 30_000 }, async () => {
    const owner = await signUp()
    const slug = `staff-made-${Date.now()}-${++seq}`
    // `userId` without a session is the plugin's system action.
    const tenant = await auth.api.createOrganization({ body: { name: "Staff Made", slug, userId: owner.userId } })

    const member = await db8.orm.public.Member.where({ organizationId: tenant.id, userId: owner.userId }).first()
    expect(member?.role).toBe("owner")
  })

  it(
    "blocks a suspended tenant's members on the next request, and unblocks on reactivate",
    {
      timeout: 30_000,
    },
    async () => {
      const owner = await signUp()
      const tenant = await auth.api.createOrganization({
        headers: owner.session,
        body: { name: "Suspendable", slug: `suspend-${Date.now()}-${++seq}` },
      })
      await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })

      await expect(resolveTenantMember(owner.userId, tenant.slug)).resolves.toMatchObject({ tenantId: tenant.id })
      await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "SUSPENDED" })
      await expect(resolveTenantMember(owner.userId, tenant.slug)).rejects.toMatchObject({ code: "not_found" })
      await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
      await expect(resolveTenantMember(owner.userId, tenant.slug)).resolves.toMatchObject({ tenantId: tenant.id })
    }
  )

  it("blocks a canceled tenant the same way", { timeout: 30_000 }, async () => {
    const owner = await signUp()
    const tenant = await auth.api.createOrganization({
      headers: owner.session,
      body: { name: "Cancelable", slug: `cancel-${Date.now()}-${++seq}` },
    })
    await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "CANCELED" })
    await expect(resolveTenantMember(owner.userId, tenant.slug)).rejects.toMatchObject({ code: "not_found" })
  })
})
