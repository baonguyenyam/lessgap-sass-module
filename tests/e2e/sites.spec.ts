import { test, expect } from "@playwright/test"
import { config } from "dotenv"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Host routing checks (task 9.1, spec/11 D4–D6): a tenant site answers on
 * its slug host, `/sites/...` on the app host refuses, suspension shows
 * maintenance + noindex, and a non-primary hostname 308s to the primary.
 */

let db8: Awaited<typeof import("@/lib/db8")>["db8"]

test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
})

// db8 is a globalThis singleton shared across specs in the
// worker — closing it here leaves the next spec with a dead
// client. The process exit cleans connections.

async function provision() {
  const id = newId().slice(0, 8).toLowerCase()
  const slug = `e2e-site-${id}`
  const tenant = await db8.orm.public.Tenant.create({ name: `E2E Site ${id}`, slug, status: "ACTIVE" })
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({
    tenantId: tenant.id,
    profile: { name: `E2E Site ${id}`, tagline: "e2e fixture" },
  })
  return { db8, tenant, id, slug, primaryHost: `shop-${id}.example.test` }
}

test.describe.configure({ mode: "serial" })

test("D5 — /sites/... on the app host refuses", async ({ browser }) => {
  const { slug } = await provision()
  const context = await browser.newContext()
  const page = await context.newPage()
  const res = await page.goto(`/sites/${slug}.lessgap.io`)
  expect(res?.status()).toBe(404)
})

test("D6 — suspended tenant's host answers maintenance with noindex", async ({ request }) => {
  const { db8, tenant, id, slug } = await provision()
  // Chromium can't override `Host`, so the site host is hit through the
  // request API — the HTML string carries the same assertions.
  let res = await request.get("/", { headers: { host: `${slug}.lessgap.io` } })
  expect(res.status()).toBe(200)
  expect(await res.text()).toContain(`E2E Site ${id}`)

  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "SUSPENDED" })
  res = await request.get("/", { headers: { host: `${slug}.lessgap.io` } })
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toMatch(/temporarily closed|maintenance/i)
  expect(html).toContain('<meta name="robots" content="noindex"')
})

test("D4 — a non-primary hostname 308s to the primary domain", async ({ request }) => {
  const { db8, tenant, slug, primaryHost } = await provision()
  await db8.orm.public.Domain.create({
    tenantId: tenant.id,
    hostname: primaryHost,
    status: "active",
    isPrimary: true,
  })
  const res = await request.get("/", { headers: { host: `${slug}.lessgap.io` }, maxRedirects: 0 })
  expect(res.status()).toBe(308)
  expect(res.headers()["location"]).toContain(primaryHost)
})
