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
      email: `cat-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "C",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "CatCo", slug: `cat-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { user, tenant, ctx: systemContext(tenant.id, "test") }
}

describe("catalog module (4.2)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("describeData counts the tenant's rows; onPurge removes only its own", async () => {
    const { tenant, ctx } = await provision()
    const other = await provision()
    await db8.orm.public.ServiceCategory.create({ tenantId: tenant.id, name: "Nails" })
    await db8.orm.public.Service.create({ tenantId: tenant.id, name: "Mani", durationMinutes: 45, priceCents: 2800 })
    await db8.orm.public.Service.create({
      tenantId: other.tenant.id,
      name: "Other",
      durationMinutes: 30,
      priceCents: 100,
    })

    const mod = (await import("@/modules/catalog/module")).default
    const lifecycle = mod.lifecycle as {
      describeData: (c: typeof ctx) => Promise<Record<string, number>>
      onExport: (c: typeof ctx) => Promise<Record<string, string>>
      onPurge: (c: typeof ctx, o: { batch: number }) => Promise<number>
    }
    const desc = await lifecycle.describeData(ctx)
    expect(desc).toEqual({ "catalog.categories": 1, "catalog.services": 1, "catalog.variants": 0 })

    await lifecycle.onPurge(ctx, { batch: 100 })
    expect(await db8.orm.public.Service.where({ tenantId: tenant.id }).all()).toHaveLength(0)
    expect(await db8.orm.public.Service.where({ tenantId: other.tenant.id }).all()).toHaveLength(1)
    expect(await db8.orm.public.ServiceCategory.where({ tenantId: tenant.id }).all()).toHaveLength(0)
  })

  it("onExport returns one JSON file per model", async () => {
    const { tenant, ctx } = await provision()
    await db8.orm.public.Service.create({ tenantId: tenant.id, name: "Pedi", durationMinutes: 60, priceCents: 3600 })
    const lifecycle = (await import("@/modules/catalog/module")).default.lifecycle as {
      onExport: (c: typeof ctx) => Promise<Record<string, string>>
    }
    const files = await lifecycle.onExport(ctx)
    expect(Object.keys(files)).toEqual(["catalog.categories.json", "catalog.services.json", "catalog.variants.json"])
    expect(JSON.parse(files["catalog.services.json"])).toHaveLength(1)
  })
})
