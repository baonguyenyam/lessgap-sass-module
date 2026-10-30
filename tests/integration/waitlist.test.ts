import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"
import { signManageToken } from "@/lib/booking/manage-token"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers({ host: "site.test" }) }
})
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const TENANT = "wl-tenant"
const siteHost = { kind: "site" as const, tenantId: TENANT, slug: "wl" }

async function provision() {
  const { resolveHost } = await import("@/platform/tenancy/host")
  vi.mocked(resolveHost).mockResolvedValue(siteHost)
  await db8.orm.public.Tenant.create({ id: TENANT, name: "Waitlist Co", slug: "wl", status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: TENANT, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.booking" },
    create: { key: "module.booking", value: true, updatedById: "test" },
    update: { value: true },
  })
}

describe("waitlist (11.1)", () => {
  beforeEach(resetDatabase)

  it("join creates an entry; a freed slot notifies it and marks it notified", async () => {
    await provision()
    const { joinWaitlist, manageAppointment } = await import("@/app/actions/booking")

    const join = await joinWaitlist({ email: "wait@example.test", wantedDate: "2099-12-31" })
    expect("error" in join ? join.error : null).toBeNull()
    const entry = await db8.orm.public.WaitlistEntry.where({ tenantId: TENANT, email: "wait@example.test" }).first()
    expect(entry?.status).toBe("waiting")

    // An appointment exists for that day — its cancel frees the slot.
    const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
    const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })
    const appointment = await db8.orm.public.Appointment.create({
      tenantId: TENANT,
      staffId: staff.id,
      customerId: customer.id,
      startTs: toTs(new Date("2099-12-31T10:00:00Z")),
      endTs: toTs(new Date("2099-12-31T11:00:00Z")),
      status: "confirmed",
    })
    const cancel = await manageAppointment({ token: signManageToken(appointment.id), toStatus: "canceled" })
    expect(cancel).toEqual({})

    const after = await db8.orm.public.WaitlistEntry.where({ id: entry!.id }).first()
    expect(after?.status).toBe("notified")
    const log = await db8.orm.public.NotificationLog.where({
      tenantId: TENANT,
      template: "booking.waitlist_open",
    }).all()
    expect(log.length).toBe(1)
    expect(log[0].recipient).toBe("wait@example.test")
  })
})

// Task 14.1 — the booked transition.
describe("waitlist booked (14.1)", () => {
  beforeEach(resetDatabase)

  it("a customer who books after a notify clears their entry", async () => {
    await provision()
    const { bookAppointment } = await import("@/app/actions/booking")
    const { resolveHost } = await import("@/platform/tenancy/host")
    vi.mocked(resolveHost).mockResolvedValue({ kind: "site" as const, tenantId: TENANT, slug: "wl" })

    // A waitlist entry for the day the customer later books.
    await db8.orm.public.WaitlistEntry.create({
      tenantId: TENANT,
      email: "wait@example.test",
      wantedDate: "2099-12-31",
      status: "notified",
    })
    const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
    await db8.orm.public.Service.create({
      tenantId: TENANT,
      name: "Cut",
      durationMinutes: 60,
      priceCents: 1,
      currency: "usd",
      id: "svc-1",
    })
    await db8.orm.public.AvailabilityRule.create({
      tenantId: TENANT,
      staffId: staff.id,
      weekday: 4,
      startMinute: 540,
      endMinute: 720,
    })

    const book = await bookAppointment({
      name: "W",
      email: "wait@example.test",
      serviceId: "svc-1",
      staffId: staff.id,
      startTs: "2099-12-31T09:00:00.000Z",
      endTs: "2099-12-31T10:00:00.000Z",
    })
    expect("error" in book ? book.error : null).toBeNull()
    const entry = await db8.orm.public.WaitlistEntry.where({ tenantId: TENANT, email: "wait@example.test" }).first()
    expect(entry?.status).toBe("booked")
  })
})
