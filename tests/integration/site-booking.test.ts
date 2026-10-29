import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { signManageToken } from "@/lib/booking/manage-token"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "site.test" }) }))
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})
vi.mock("@/lib/email-transport", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email-transport")>()
  return { ...mod, sendEmail: vi.fn(async () => true) }
})

const { bookAppointment, manageAppointment } = await import("@/app/actions/booking")

afterAll(async () => db8.close())
const { resolveHost } = await import("@/platform/tenancy/host")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `sb-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "S",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "Salon", slug: `sb-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.create({ key: "module.booking", value: true, updatedById: "test" })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "Mia" })
  const service = await db8.orm.public.Service.create({
    tenantId: tenant.id,
    name: "Mani",
    durationMinutes: 30,
    priceCents: 2800,
  })
  await db8.orm.public.AvailabilityRule.create({
    tenantId: tenant.id,
    staffId: staff.id,
    weekday: 1,
    startMinute: 540,
    endMinute: 1020,
  })
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: tenant.slug })
  return { tenant, staff, service }
}

describe("site booking (5.4)", () => {
  beforeEach(resetDatabase)

  it("books a slot, creates the customer and logs the notification", async () => {
    const { tenant, staff, service } = await provision()
    // Monday March 8 2027 09:00 UTC — inside the 09:00-17:00 Monday rule.
    const res = await bookAppointment({
      serviceId: service.id,
      startTs: "2027-03-08T14:00:00.000Z",
      endTs: "2027-03-08T14:30:00.000Z",
      name: "Ana",
      email: "ana@example.test",
      marketingConsent: true,
    })
    expect(res.error).toBeUndefined()
    expect(res.status).toBe("confirmed")
    const appointment = await db8.orm.public.Appointment.where({ tenantId: tenant.id }).first()
    expect(appointment).not.toBeNull()
    expect(appointment!.staffId).toBe(staff.id)
    const customer = await db8.orm.public.Customer.where({ tenantId: tenant.id, email: "ana@example.test" }).first()
    expect(customer).not.toBeNull()
    expect(customer!.marketingConsentAt).not.toBeNull()
    const event = await db8.orm.public.AppointmentEvent.where({ tenantId: tenant.id }).first()
    expect(event).not.toBeNull()
    expect(event!.toStatus).toBe("confirmed")
    const log = await db8.orm.public.NotificationLog.where({ tenantId: tenant.id }).first()
    expect(log).not.toBeNull()
    expect(log!.template).toBe("booking.confirmation")
    expect(log!.recipient).toBe("ana@example.test")
  })

  it("a manage token reschedules or cancels the appointment", async () => {
    const { tenant, service } = await provision()
    const res = await bookAppointment({
      serviceId: service.id,
      startTs: "2027-03-08T14:00:00.000Z",
      endTs: "2027-03-08T14:30:00.000Z",
      name: "Ana",
      email: "ana@example.test",
    })
    const token = signManageToken(res.id!)
    const bad = await manageAppointment({
      token,
      startTs: "2027-03-08T15:00:00.000Z",
      endTs: "2027-03-08T15:30:00.000Z",
    })
    expect(bad.error).toBeUndefined()
    const moved = await db8.orm.public.Appointment.where({ tenantId: tenant.id }).first()
    expect(toDate(moved!.startTs).toISOString()).toBe("2027-03-08T15:00:00.000Z")
    const cancel = await manageAppointment({ token, toStatus: "canceled" })
    expect(cancel.error).toBeUndefined()
    const gone = await db8.orm.public.Appointment.where({ tenantId: tenant.id }).first()
    expect(gone!.status).toBe("canceled")
  })

  it("a slot outside the rules is refused", async () => {
    const { service } = await provision()
    const res = await bookAppointment({
      serviceId: service.id,
      startTs: "2027-03-08T03:00:00.000Z", // 03:00 — outside the 09:00 rule
      endTs: "2027-03-08T03:30:00.000Z",
      name: "Ana",
      email: "ana@example.test",
    })
    expect(res.error).toBe("conflict")
  })
})

describe("exclusion constraint race (5.9)", () => {
  beforeEach(resetDatabase)

  it("two inserts for the same staff slot — the database refuses the second", async () => {
    const { tenant, staff } = await provision()
    const customer = await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "Ana" })
    const row = {
      tenantId: tenant.id,
      customerId: customer.id,
      staffId: staff.id,
      startTs: "2027-03-08T16:00:00.000Z",
      endTs: "2027-03-08T17:00:00.000Z",
      status: "confirmed" as const,
    }
    await db8.orm.public.Appointment.create(row)
    // The exclusion constraint is the last word — overlapping non-canceled
    // rows on one staff member fail at the database, not in app code.
    // (try/catch, not rejects.toThrow: the ORM's StructuredError breaks the
    // vitest diff printer.)
    let caught: unknown = null
    try {
      await db8.orm.public.Appointment.create({
        ...row,
        startTs: "2027-03-08T16:30:00.000Z",
        endTs: "2027-03-08T17:30:00.000Z",
      })
    } catch (error) {
      caught = error
    }
    expect(caught).not.toBeNull()
  })

  it("two bookAppointment calls on one slot — one wins, the loser gets conflict", async () => {
    const { service } = await provision()
    const input = {
      serviceId: service.id,
      startTs: "2027-03-08T15:00:00.000Z",
      endTs: "2027-03-08T15:30:00.000Z",
      name: "Ana",
      email: "ana@x.test",
    }
    const [a, b] = await Promise.all([bookAppointment(input), bookAppointment({ ...input, name: "Bia" })])
    const outcomes = [a.error, b.error]
    expect(outcomes.filter((e) => e === "conflict")).toHaveLength(1)
    expect(outcomes.filter((e) => e === undefined)).toHaveLength(1)
  })

  it("a dental tenant's booking refuses notes (PHI)", async () => {
    const { tenant, service } = await provision()
    await db8.orm.public.Tenant.where({ id: tenant.id }).update({ verticalKey: "dental" })
    const res = await bookAppointment({
      serviceId: service.id,
      startTs: "2027-03-08T18:00:00.000Z",
      endTs: "2027-03-08T18:30:00.000Z",
      name: "Ana",
      email: "ana@x.test",
      notes: "my tooth hurts",
    })
    expect(res.error).toBe("invalid_input")
  })
})
