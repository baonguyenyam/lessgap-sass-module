import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
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

const TENANT = "pay-tenant"

async function provision() {
  const { resolveHost } = await import("@/platform/tenancy/host")
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site" as const, tenantId: TENANT, slug: "pay" })
  await db8.orm.public.Tenant.create({ id: TENANT, name: "Pay Co", slug: "pay", status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: TENANT, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.booking" },
    create: { key: "module.booking", value: true, updatedById: "test" },
    update: { value: true },
  })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
  await db8.orm.public.Service.create({
    id: "svc-1",
    tenantId: TENANT,
    name: "Cut",
    durationMinutes: 60,
    priceCents: 5000,
    currency: "usd",
  })
  await db8.orm.public.AvailabilityRule.create({
    tenantId: TENANT,
    staffId: staff.id,
    weekday: 4,
    startMinute: 540,
    endMinute: 720,
  })
  return staff
}

describe("booking pay path (14.2)", () => {
  beforeEach(resetDatabase)

  it("a gift card code debits against the appointment", async () => {
    const staff = await provision()
    const card = await db8.orm.public.GiftCard.create({ tenantId: TENANT, code: "GC-1", balanceCents: 8000 })
    const { bookAppointment } = await import("@/app/actions/booking")
    const book = await bookAppointment({
      name: "C",
      email: "c@example.test",
      serviceId: "svc-1",
      staffId: staff.id,
      startTs: "2099-12-31T09:00:00.000Z",
      endTs: "2099-12-31T10:00:00.000Z",
      giftCardCode: "GC-1",
    })
    expect("error" in book ? book.error : null).toBeNull()
    const after = await db8.orm.public.GiftCard.where({ id: card.id }).first()
    expect(after?.balanceCents).toBe(3000)
    const ledger = await db8.orm.public.GiftCardLedger.where({ cardId: card.id }).all()
    expect(ledger[0].reason).toBe("spent")
    expect(ledger[0].appointmentId).not.toBeNull()
  })

  it("a package holding spends a session against the appointment", async () => {
    const staff = await provision()
    const pkg = await db8.orm.public.Package.create({
      tenantId: TENANT,
      name: "5 sessions",
      sessions: 2,
      priceCents: 20000,
    })
    const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })
    const holding = await db8.orm.public.CustomerPackage.create({
      tenantId: TENANT,
      packageId: pkg.id,
      customerId: customer.id,
      sessionsLeft: 2,
    })
    const { bookAppointment } = await import("@/app/actions/booking")
    const book = await bookAppointment({
      name: "C",
      email: "c@example.test",
      serviceId: "svc-1",
      staffId: staff.id,
      startTs: "2099-12-31T09:00:00.000Z",
      endTs: "2099-12-31T10:00:00.000Z",
      packageHoldingId: holding.id,
    })
    expect("error" in book ? book.error : null).toBeNull()
    const after = await db8.orm.public.CustomerPackage.where({ id: holding.id }).first()
    expect(after?.sessionsLeft).toBe(1)
  })
})
