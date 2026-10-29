import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { applyVertical, removeSampleData } from "@/platform/verticals/apply"
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
      email: `vert-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "V",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "VertCo", slug: `vert-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { user, tenant, ctx: systemContext(tenant.id, "test") }
}

describe("verticals (4.4)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("applyVertical writes terminology, enables modules, and marks sample rows", async () => {
    const { tenant, ctx } = await provision()
    await applyVertical(ctx, "nail_salon")

    const settings = await db8.orm.public.TenantSetting.where({ tenantId: tenant.id }).all()
    const term = settings.find((s) => s.key === "vertical.terminology")
    expect((term?.value as { staff: string }).staff).toBe("technician")

    const modules = await db8.orm.public.TenantModule.where({ tenantId: tenant.id }).all()
    expect(modules.map((m) => m.moduleKey).sort()).toEqual(["catalog", "newsletter", "team"])

    const services = await db8.orm.public.Service.where({ tenantId: tenant.id }).all()
    expect(services.every((s) => s.isSample)).toBe(true)
    expect(services.length).toBeGreaterThan(0)
    const categories = await db8.orm.public.ServiceCategory.where({ tenantId: tenant.id }).all()
    expect(categories).toHaveLength(4)
    const staff = await db8.orm.public.StaffMember.where({ tenantId: tenant.id }).all()
    expect(staff.every((s) => s.isSample)).toBe(true)
    expect(staff).toHaveLength(2)
  })

  it("removeSampleData deletes only isSample rows", async () => {
    const { tenant, ctx } = await provision()
    await applyVertical(ctx, "nail_salon")
    await db8.orm.public.Service.create({ tenantId: tenant.id, name: "Real service", isSample: false })
    await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "Real staff", isSample: false })

    await removeSampleData(ctx)

    const services = await db8.orm.public.Service.where({ tenantId: tenant.id }).all()
    expect(services).toHaveLength(1)
    expect(services[0].name).toBe("Real service")
    const staff = await db8.orm.public.StaffMember.where({ tenantId: tenant.id }).all()
    expect(staff).toHaveLength(1)
    expect(staff[0].name).toBe("Real staff")
  })
})
