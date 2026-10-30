import { test, expect, type BrowserContext } from "@playwright/test"
import { db8 } from "@/lib/db8"
import { auth } from "@/auth"
import { newId } from "@/lib/ids"
import { freshEmail } from "./fresh-email"
import { signManageToken } from "@/lib/booking/manage-token"
import { toTs } from "@/lib/timestamps"

/** Phase 14's e2e: the sales page sells a card and lists it; a completed
 * appointment's manage page asks for a review; `/status` renders the
 * platform's `HealthCheck` rows. */

const password = "correct horse battery staple"
const TENANT_HOME = /\/t\//

async function signUpAndTenant(context: BrowserContext) {
  const email = freshEmail("p14")
  const slug = `e2e-p14-${newId().slice(0, 8).toLowerCase()}`
  const { user } = await auth.api.signUpEmail({ body: { email, password, name: "E2E" } })
  const tenant = await auth.api.createOrganization({ body: { name: "E2E P14", slug, userId: user.id } })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  const page = await context.newPage()
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  return { page, email, tenant, slug }
}

test("the sales page sells a gift card and lists it", async ({ context }) => {
  const { page, tenant, slug } = await signUpAndTenant(context)
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "booking", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.booking" },
    create: { key: "module.booking", value: true, updatedById: "e2e" },
    update: { value: true },
  })

  await page.goto(`/t/${slug}/sales`)
  await page
    .getByRole("button", { name: /^sell$/i })
    .first()
    .click()
  await page.locator('input[type="number"]').fill("80")
  await page.locator('input[type="email"]').fill("buyer@example.test")
  await page.getByRole("button", { name: /^save$/i }).click()
  await page.waitForLoadState("networkidle")

  await expect(page.locator("body")).toContainText("GC-")
  const card = await db8.orm.public.GiftCard.where({ tenantId: tenant.id }).first()
  expect(card?.balanceCents).toBe(8000)
})

test("a completed appointment's manage page asks for a review", async ({ context, request }) => {
  const { tenant, slug } = await signUpAndTenant(context)
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "booking", enabled: true })
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  const staff = await db8.orm.public.StaffMember.create({ tenantId: tenant.id, name: "S" })
  const customer = await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "C" })
  const appt = await db8.orm.public.Appointment.create({
    tenantId: tenant.id,
    staffId: staff.id,
    customerId: customer.id,
    startTs: toTs(new Date("2099-12-31T10:00:00Z")),
    endTs: toTs(new Date("2099-12-31T11:00:00Z")),
    status: "completed",
  })

  const token = signManageToken(appt.id)
  const siteHost = `${slug}.lessgap.io`
  // Site surfaces go through request's Host header — the browser's Host is
  // DNS-bound and can't reach a tenant domain locally.
  const res = await request.get(`/book/manage/${token}`, { headers: { host: siteHost } })
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain("How was your visit")
  // The form's submit is the server action — callable directly (the token
  // is the auth).
  const { submitReview } = await import("@/app/actions/reviews")
  const sub = await submitReview({ token, rating: 4, body: "E2E" })
  expect("error" in sub ? sub.error : null).toBeNull()
  const review = await db8.orm.public.Review.where({ appointmentId: appt.id }).first()
  expect(review?.status).toBe("pending")
})

test("/status renders the platform's HealthCheck rows", async ({ request }) => {
  const { probeHealth } = await import("@/platform/status/probe")
  await probeHealth()
  const res = await request.get("/status")
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain("database")
  expect(html).toContain("queue")
})
