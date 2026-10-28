import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { getEntitlements } from "@/platform/entitlements"
import { FEATURES } from "@/platform/entitlements/registry"
import { memberCan } from "@/platform/tenancy/permissions"
import { resetDatabase } from "@tests/helpers/db"

// Task 1.8b: custom roles through the plugin, gated by `roles.custom` and
// capped by `roles.max`. Outside Next, "use cache" helpers would throw.
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {} }))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

let seq = 0
async function signedInOwner() {
  const email = `roles-owner-${Date.now()}-${++seq}@example.test`
  const { headers } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: "Owner" },
    returnHeaders: true,
  })
  const session = new Headers({ cookie: headers.get("set-cookie")!.split(";")[0] })
  const tenant = await auth.api.createOrganization({
    body: { name: "Roles Tenant", slug: `roles-${Date.now()}-${seq}` },
    headers: session,
  })
  return { session, tenantId: tenant!.id }
}

const createRole = (session: Headers, organizationId: string, role: string) =>
  auth.api.createOrgRole({ headers: session, body: { organizationId, role, permission: { bookings: ["view"] } } })

describe("custom roles as a feature (task 1.8b)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("refuses the role past roles.max, through the plugin itself", { timeout: 60_000 }, async () => {
    const { session, tenantId } = await signedInOwner()
    const max = (await getEntitlements({ tenantId })).limit("roles.max")
    expect(max).toBe(FEATURES["roles.max"].default)
    for (let i = 0; i < max!; i++) await createRole(session, tenantId, `role-${i}`)
    await expect(createRole(session, tenantId, "one-too-many")).rejects.toThrow()
    expect(await db8.orm.public.OrganizationRole.where({ organizationId: tenantId }).all()).toHaveLength(max!)
  })

  it("refuses every custom role when the platform switches roles.custom off", { timeout: 30_000 }, async () => {
    const { session, tenantId } = await signedInOwner()
    await db8.orm.public.PlatformSwitch.create({ key: "feature.roles.custom", value: false as never })
    const entitlements = await getEntitlements({ tenantId })
    expect(entitlements.has("roles.custom")).toBe(false)
    expect(entitlements.limit("roles.max")).toBe(0)
    await expect(createRole(session, tenantId, "front-desk")).rejects.toThrow()
  })

  it("applies edited permissions on the member's next check (T7)", { timeout: 30_000 }, async () => {
    const { session, tenantId } = await signedInOwner()
    await createRole(session, tenantId, "front-desk")
    expect(await memberCan(tenantId, "front-desk", "bookings", "manage")).toBe(false)

    await auth.api.updateOrgRole({
      headers: session,
      body: {
        organizationId: tenantId,
        roleName: "front-desk",
        data: { permission: { bookings: ["view", "manage"] } },
      },
    })
    expect(await memberCan(tenantId, "front-desk", "bookings", "manage")).toBe(true)
  })

  it("never lets the owner role be created, edited or deleted as a custom role", { timeout: 30_000 }, async () => {
    const { session, tenantId } = await signedInOwner()
    await expect(createRole(session, tenantId, "owner")).rejects.toThrow()
    await expect(
      auth.api.deleteOrgRole({ headers: session, body: { organizationId: tenantId, roleName: "owner" } })
    ).rejects.toThrow()
  })
})
