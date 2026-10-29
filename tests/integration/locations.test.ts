import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const TENANT = "loc-tenant"

describe("locations (13.3)", () => {
  beforeEach(resetDatabase)

  it("two staff at different locations book the same slot without clashing", async () => {
    await db8.orm.public.Tenant.create({ id: TENANT, name: "Loc Co", slug: "loc", status: "ACTIVE" })
    const loc1 = await db8.orm.public.Location.create({ tenantId: TENANT, name: "Downtown" })
    const loc2 = await db8.orm.public.Location.create({ tenantId: TENANT, name: "Uptown" })
    const staff1 = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "A", locationId: loc1.id })
    const staff2 = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "B", locationId: loc2.id })
    const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })

    // Same slot, different locations — both hold.
    const a1 = await db8.orm.public.Appointment.create({
      tenantId: TENANT,
      staffId: staff1.id,
      customerId: customer.id,
      locationId: loc1.id,
      startTs: toTs(new Date("2099-12-31T10:00:00Z")),
      endTs: toTs(new Date("2099-12-31T11:00:00Z")),
      status: "confirmed",
    })
    const a2 = await db8.orm.public.Appointment.create({
      tenantId: TENANT,
      staffId: staff2.id,
      customerId: customer.id,
      locationId: loc2.id,
      startTs: toTs(new Date("2099-12-31T10:00:00Z")),
      endTs: toTs(new Date("2099-12-31T11:00:00Z")),
      status: "confirmed",
    })
    expect(a1.locationId).toBe(loc1.id)
    expect(a2.locationId).toBe(loc2.id)
  })
})
