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
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})

const TENANT = "gc-tenant"

async function provision() {
  await db8.orm.public.Tenant.upsert({
    conflictOn: { id: TENANT },
    create: { id: TENANT, name: "Card Co", slug: "gc", status: "ACTIVE" },
    update: {},
  })
  await db8.orm.public.TenantModule.create({ tenantId: TENANT, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.booking" },
    create: { key: "module.booking", value: true, updatedById: "test" },
    update: { value: true },
  })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: TENANT, name: "S" })
  const customer = await db8.orm.public.Customer.create({ tenantId: TENANT, name: "C" })
  const service = await db8.orm.public.Service.create({
    tenantId: TENANT,
    name: "Massage",
    durationMinutes: 60,
    priceCents: 5000,
    currency: "usd",
  })
  const appointment = await db8.orm.public.Appointment.create({
    tenantId: TENANT,
    staffId: staff.id,
    customerId: customer.id,
    serviceId: service.id,
    startTs: toTs(new Date("2099-12-31T10:00:00Z")),
    endTs: toTs(new Date("2099-12-31T11:00:00Z")),
    status: "completed",
  })
  return { appointment, service }
}

describe("gift cards (12.1)", () => {
  beforeEach(resetDatabase)

  it("a card debits when spent; the ledger's sum is the balance's twin", async () => {
    const { requireTenantContext } = await import("@/platform/tenancy/require-member")
    vi.mocked(requireTenantContext).mockResolvedValue({
      user: { id: "u" },
      member: { role: "OWNER" },
      tenant: { id: TENANT },
      tenantId: TENANT,
    } as never)
    const { buyGiftCard, redeemGiftCard } = await import("@/app/actions/gift-cards")
    const { appointment } = await provision()

    const bought = await buyGiftCard({ amountCents: 8000, buyerEmail: "b@example.test" })
    const code = "code" in bought && bought.code ? bought.code : ""
    expect(code).not.toBe("")

    const redeemed = await redeemGiftCard({ code, appointmentId: appointment.id })
    expect("error" in redeemed ? redeemed.error : null).toBeNull()
    expect("remainingCents" in redeemed ? redeemed.remainingCents : -1).toBe(3000)

    const card = await db8.orm.public.GiftCard.where({ code }).first()
    expect(card?.balanceCents).toBe(3000)
    const ledger = await db8.orm.public.GiftCardLedger.where({ cardId: card!.id }).all()
    expect(ledger.reduce((s, l) => s + l.deltaCents, 0)).toBe(3000)

    // The same appointment can't double-spend the card.
    const dup = await redeemGiftCard({ code, appointmentId: appointment.id })
    expect("error" in dup ? dup.error : null).toBe("conflict")

    // A spent-down card stops.
    const small = await buyGiftCard({ amountCents: 1000 })
    const code2 = "code" in small && small.code ? small.code : ""
    const appt2 = await db8.orm.public.Appointment.create({
      tenantId: TENANT,
      staffId: appointment.staffId,
      customerId: appointment.customerId,
      serviceId: appointment.serviceId ?? null,
      startTs: toTs(new Date("2099-12-30T10:00:00Z")),
      endTs: toTs(new Date("2099-12-30T11:00:00Z")),
      status: "completed",
    })
    const short = await redeemGiftCard({ code: code2, appointmentId: appt2.id })
    expect("error" in short ? short.error : null).toBe("invalid_input")
  })
})
