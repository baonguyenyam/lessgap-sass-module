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
      email: `cust-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "C",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "CustCo", slug: `cust-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { user, tenant, ctx: systemContext(tenant.id, "test") }
}

describe("customers module (5.5)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("describeData counts the tenant's customers; onPurge removes only its own", async () => {
    const { tenant, ctx } = await provision()
    const other = await provision()
    await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "Ana", email: "a@x.test" })
    await db8.orm.public.Customer.create({ tenantId: other.tenant.id, name: "Bia", email: "b@x.test" })

    const mod = (await import("@/modules/customers/module")).default
    const lifecycle = mod.lifecycle as {
      describeData: (c: typeof ctx) => Promise<Record<string, number>>
      onExport: (c: typeof ctx) => Promise<Record<string, string>>
      onPurge: (c: typeof ctx, o: { batch: number }) => Promise<number>
    }
    expect(await lifecycle.describeData(ctx)).toEqual({ "customers.customers": 1 })
    await lifecycle.onPurge(ctx, { batch: 100 })
    expect(await db8.orm.public.Customer.where({ tenantId: tenant.id }).all()).toHaveLength(0)
    expect(await db8.orm.public.Customer.where({ tenantId: other.tenant.id }).all()).toHaveLength(1)
  })
})
