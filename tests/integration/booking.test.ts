import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { nowTs, toTs } from "@/lib/timestamps"
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
      email: `bk-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "B",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "BookCo", slug: `bk-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { user, tenant, ctx: systemContext(tenant.id, "test") }
}

describe("booking module (5.3)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("describeData counts the tenant's rows; onPurge removes only its own", async () => {
    const { tenant, ctx } = await provision()
    const other = await provision()
    const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "Mia" })
    const customer = await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "Ana" })
    const appt = await db8.orm.public.Appointment.create({
      tenantId: tenant.id,
      customerId: customer.id,
      staffId: staff.id,
      startTs: nowTs(),
      endTs: toTs(new Date(Date.now() + 30 * 60 * 1000)),
      status: "confirmed",
    })
    await db8.orm.public.AppointmentEvent.create({ tenantId: tenant.id, appointmentId: appt.id, toStatus: "confirmed" })
    await db8.orm.public.Resource.create({ tenantId: tenant.id, name: "Chair" })
    await db8.orm.public.AvailabilityRule.create({
      tenantId: tenant.id,
      staffId: staff.id,
      weekday: 1,
      startMinute: 540,
      endMinute: 1020,
    })
    await db8.orm.public.Appointment.create({
      tenantId: other.tenant.id,
      customerId: (await db8.orm.public.Customer.create({ tenantId: other.tenant.id, name: "Other" })).id,
      staffId: (await db8.orm.public.StaffMember.create({ tenantId: other.tenant.id, name: "O" })).id,
      startTs: nowTs(),
      endTs: toTs(new Date(Date.now() + 30 * 60 * 1000)),
      status: "confirmed",
    })

    const mod = (await import("@/modules/booking/module")).default
    const lifecycle = mod.lifecycle as {
      describeData: (c: typeof ctx) => Promise<Record<string, number>>
      onExport: (c: typeof ctx) => Promise<Record<string, string>>
      onPurge: (c: typeof ctx, o: { batch: number }) => Promise<number>
    }
    const desc = await lifecycle.describeData(ctx)
    expect(desc).toEqual({
      "booking.appointments": 1,
      "booking.events": 1,
      "booking.rules": 1,
      "booking.timeOff": 0,
      "booking.resources": 1,
    })

    await lifecycle.onPurge(ctx, { batch: 100 })
    expect(await db8.orm.public.Appointment.where({ tenantId: tenant.id }).all()).toHaveLength(0)
    expect(await db8.orm.public.AppointmentEvent.where({ tenantId: tenant.id }).all()).toHaveLength(0)
    expect(await db8.orm.public.Appointment.where({ tenantId: other.tenant.id }).all()).toHaveLength(1)
    expect(await db8.orm.public.Resource.where({ tenantId: tenant.id }).all()).toHaveLength(0)
  })
})
