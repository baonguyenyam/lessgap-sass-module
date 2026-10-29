import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { nowTs, toTs } from "@/lib/timestamps"
import { smsStop } from "@/platform/notify/sms"
import { systemContext } from "@/platform/tenancy/context"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("@/lib/email-transport", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email-transport")>()
  return { ...mod, sendEmail: vi.fn(async () => true) }
})

const { sendReminders } = await import("@/platform/booking/reminders")

async function provision(reminderMinutesOffset: number, smsConsent = false) {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `rem-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "R",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "RemCo", slug: `rem-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "Mia" })
  const customer = await db8.orm.public.Customer.create({
    tenantId: tenant.id,
    name: "Ana",
    email: "ana@x.test",
    phone: "+15550100",
    ...(smsConsent ? { smsConsentAt: nowTs(), smsConsentSource: "site" } : {}),
  })
  const appt = await db8.orm.public.Appointment.create({
    tenantId: tenant.id,
    customerId: customer.id,
    staffId: staff.id,
    startTs: toTs(new Date(Date.now() + reminderMinutesOffset * 60_000)),
    endTs: toTs(new Date(Date.now() + (reminderMinutesOffset + 30) * 60_000)),
    status: "confirmed",
  })
  return { tenant, customer, appt }
}

describe("booking reminders (5.7)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("sends a reminder inside the 24h window, once", async () => {
    const { tenant, appt } = await provision(20 * 60) // 20 hours out — inside the 24h window, outside the 2h one.
    const first = await sendReminders()
    expect(first).toBe(1)
    const log = await db8.orm.public.NotificationLog.where({ tenantId: tenant.id, template: "booking.reminder" }).all()
    expect(log.length).toBe(1)
    const again = await sendReminders()
    expect(again).toBe(0) // remindedAt stamped — the window already fired.
    void appt
  })

  it("does not send SMS without consent, even when entitled", async () => {
    const { tenant } = await provision(20 * 60, false)
    await sendReminders()
    const sms = await db8.orm.public.NotificationLog.where({ tenantId: tenant.id, channel: "sms" }).all()
    expect(sms.length).toBe(0)
  })

  it("STOP clears the customer's SMS consent", async () => {
    const { tenant, customer } = await provision(20 * 60, true)
    await smsStop(systemContext(tenant.id, "test"), "+15550100")
    const row = await db8.orm.public.Customer.where({ id: customer.id }).first()
    expect(row!.smsConsentAt).toBeNull()
  })
})
