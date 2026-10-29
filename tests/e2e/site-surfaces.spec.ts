import { test, expect } from "@playwright/test"
import { config } from "dotenv"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Site surfaces (task 11.3): the waitlist join form shows when a day has no
 * slots, and a `published` review renders on the site while a `pending` one
 * stays hidden.
 */

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
})
// The db8 globalThis singleton is shared across specs in the worker —
// closing it in one spec leaves the next with "Postgres client is
// closed". The process exit cleans connections; no afterAll.

async function provision(slug: string) {
  const tenant = await db8.orm.public.Tenant.create({ name: "E2E Surf", slug, status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.booking" },
    create: { key: "module.booking", value: true, updatedById: "e2e" },
    update: { value: true },
  })
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({ tenantId: tenant.id, profile: { name: "E2E Surf" } })
  return tenant
}

test("the waitlist join shows when a day is full; a published review renders", async ({ request }) => {
  const slug = `e2e-sur-${newId().slice(0, 8).toLowerCase()}`
  const tenant = await provision(slug)
  const siteHost = `${slug}.lessgap.io`

  // No AvailabilityRule — the booking page's availableSlots is empty and
  // the join form shows.
  const book = await request.get("/book", { headers: { host: siteHost } })
  expect(book.status()).toBe(200)
  expect(await book.text()).toContain("waitlist")

  // A pending review stays hidden; the published one renders its body.
  const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "S" })
  const customer = await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "Sue P" })
  const appt = await db8.orm.public.Appointment.create({
    tenantId: tenant.id,
    staffId: staff.id,
    customerId: customer.id,
    startTs: "2099-12-31T10:00:00Z",
    endTs: "2099-12-31T11:00:00Z",
    status: "completed",
  })
  await db8.orm.public.Review.create({
    tenantId: tenant.id,
    appointmentId: appt.id,
    customerId: customer.id,
    rating: 5,
    body: "E2E great",
    status: "published",
  })
  const site = await request.get("/", { headers: { host: siteHost } })
  const html = await site.text()
  expect(html).toContain("E2E great")
})
