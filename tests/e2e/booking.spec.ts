import { test, expect } from "@playwright/test"
import { config } from "dotenv"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Booking journey (task 9.3): the `/book` page renders on a site host,
 * an appointment lands `requested`, and the signed manage link
 * reschedules it. `bookAppointment` reads `headers()` for the site ctx —
 * a spec can't call it outside a request (integration covers the action
 * body: `site-booking.test.ts`); here the page + manage legs run real.
 */

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
let manageAppointment: Awaited<typeof import("@/app/actions/booking")>["manageAppointment"]
let signManageToken: Awaited<typeof import("@/lib/booking/manage-token")>["signManageToken"]

test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
  ;({ manageAppointment } = await import("@/app/actions/booking"))
  ;({ signManageToken } = await import("@/lib/booking/manage-token"))
})
// db8 is a globalThis singleton shared across specs in the
// worker — closing it here leaves the next spec with a dead
// client. The process exit cleans connections.

function nextFriday() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + ((5 + 7 - d.getUTCDay()) % 7 || 7))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

test("site /book renders → appointment → manage link reschedules", async ({ request }) => {
  const slug = `e2e-book-${newId().slice(0, 8).toLowerCase()}`
  const tenant = await db8.orm.public.Tenant.create({ name: "E2E Book", slug, status: "ACTIVE" })
  const tm = await db8.orm.public.TenantModule.where({ tenantId: tenant.id, moduleKey: "booking" }).first()
  if (!tm) await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "booking", enabled: true })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "Ana" })
  const service = await db8.orm.public.Service.create({
    tenantId: tenant.id,
    name: "Haircut",
    durationMinutes: 30,
    priceCents: 2500,
    currency: "USD",
    status: "active",
  })
  await db8.orm.public.StaffService.create({ tenantId: tenant.id, staffMemberId: staff.id, serviceId: service.id })
  for (let weekday = 0; weekday < 7; weekday++) {
    await db8.orm.public.AvailabilityRule.create({
      tenantId: tenant.id,
      staffId: staff.id,
      weekday,
      startMinute: 480,
      endMinute: 1200,
    })
  }
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({ tenantId: tenant.id, profile: { name: "E2E Book" } })

  // The /book page resolves the site by Host and offers the service.
  const siteHost = `${slug}.lessgap.io`
  const res = await request.get("/book", { headers: { host: siteHost } })
  expect(res.status()).toBe(200)
  expect(await res.text()).toContain("Haircut")

  // The appointment the booking would land (bookAppointment's own path is
  // integration-covered — it needs a request store the spec can't build).
  const customer = await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "Visitor", email: "v@x.test" })
  const day = nextFriday()
  const appointment = await db8.orm.public.Appointment.create({
    tenantId: tenant.id,
    customerId: customer.id,
    staffId: staff.id,
    serviceId: service.id,
    startTs: `${day} 10:00:00`,
    endTs: `${day} 10:30:00`,
    status: "requested",
    source: "site",
  })

  // The manage link's own page resolves — then the action reschedules.
  const token = signManageToken(appointment.id)
  const manageRes = await request.get(`/book/manage/${token}`, { headers: { host: siteHost } })
  expect(manageRes.status()).toBe(200)

  // `availableSlots` emits ISO strings — the manage action compares on
  // exact equality, so the reschedule input uses ISO too.
  const managed = await manageAppointment({
    token,
    startTs: `${day}T14:00:00.000Z`,
    endTs: `${day}T14:30:00.000Z`,
  })
  expect("error" in managed).toBe(false)
  const after = await db8.orm.public.Appointment.where({ id: appointment.id }).first()
  expect(after!.startTs).toContain("14:00")
})
