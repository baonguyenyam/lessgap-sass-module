import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `team-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "T",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "TeamCo", slug: `team-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { user, tenant, ctx: systemContext(tenant.id, "test") }
}

describe("team module (4.3)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a StaffMember exists without a Member/User row; purge is tenant-scoped", async () => {
    const { tenant, ctx } = await provision()
    const other = await provision()
    // A staff member is not a Member and not a User — just a profile.
    const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "Mia", bio: "Stylist" })
    expect(await db8.orm.public.Member.where({ id: staff.id }).first()).toBeNull()
    expect(await db8.orm.public.User.where({ id: staff.id }).first()).toBeNull()
    await db8.orm.public.StaffMember.create({ tenantId: other.tenant.id, name: "Other" })

    const lifecycle = (await import("@/modules/team/module")).default.lifecycle as {
      describeData: (c: typeof ctx) => Promise<Record<string, number>>
      onExport: (c: typeof ctx) => Promise<Record<string, string>>
      onPurge: (c: typeof ctx, o: { batch: number }) => Promise<number>
    }
    expect(await lifecycle.describeData(ctx)).toEqual({ "team.staff": 1, "team.serviceLinks": 0 })

    const files = await lifecycle.onExport(ctx)
    expect(Object.keys(files)).toEqual(["team.staff.json", "team.serviceLinks.json"])
    expect(JSON.parse(files["team.staff.json"])).toHaveLength(1)

    await lifecycle.onPurge(ctx, { batch: 100 })
    expect(await db8.orm.public.StaffMember.where({ tenantId: tenant.id }).all()).toHaveLength(0)
    expect(await db8.orm.public.StaffMember.where({ tenantId: other.tenant.id }).all()).toHaveLength(1)
  })
})
