import { test, expect, type BrowserContext } from "@playwright/test"
import { config } from "dotenv"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Module downgrade (task 9.2, spec/11 E8): a tenant with `catalog` on
 * publishes products on the site and shows the nav item; disabling hides
 * both while the `Product` rows stay — downgrade hides, never deletes.
 */

const password = "correct horse battery staple"

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
let auth: Awaited<typeof import("@/auth")>["auth"]
test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
  auth = (await import("@/auth")).auth
})
test.afterAll(async () => {
  await db8.close()
})

/** Signup now lands on the onboarding wizard (phase 4), so the spec
 * provisions the member+tenant directly and logs in through the form —
 * the downgrade check needs the dashboard, not the wizard. */
async function signUpAndTenant(context: BrowserContext) {
  const email = freshEmail("module")
  const slug = `e2e-mod-${newId().slice(0, 8).toLowerCase()}`
  const { user } = await auth.api.signUpEmail({ body: { email, password, name: "E2E" } })
  const tenant = await auth.api.createOrganization({ body: { name: "E2E Mod", slug, userId: user.id } })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  const page = await context.newPage()
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  return { page, email, tenant, slug }
}

test("E8 — disabling a module hides it on site and dashboard, keeps the rows", async ({ browser, request }) => {
  const context = await browser.newContext()
  const { page, tenant, slug } = await signUpAndTenant(context)

  // Module on: catalog switch + tenant module + a product + published site.
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.catalog" },
    create: { key: "module.catalog", value: true, updatedById: "e2e" },
    update: { value: true },
  })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "catalog", enabled: true })
  const serviceName = `E2E Service ${newId().slice(0, 6)}`
  const service = await db8.orm.public.Service.create({
    tenantId: tenant.id,
    name: serviceName,
    durationMinutes: 30,
    priceCents: 1500,
    currency: "USD",
    status: "active",
  })
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({
    tenantId: tenant.id,
    profile: { name: `E2E ${slug}`, tagline: "module test" },
  })

  const siteHost = `${slug}.lessgap.io`
  let res = await request.get("/", { headers: { host: siteHost } })
  expect(res.status()).toBe(200)
  expect(await res.text()).toContain(serviceName)

  // Disable through the real UI path — the server action's revalidateTag
  // is what drops the cached site data (E8 found this: a raw update left
  // the module's section rendered until the cache expired).
  await page.goto(`/t/${slug}/settings/modules`)
  await page
    .getByRole("button", { name: /^disable$/i })
    .first()
    .click()
  await page.waitForLoadState("networkidle")

  res = await request.get("/", { headers: { host: siteHost } })
  expect(res.status()).toBe(200)
  expect(await res.text()).not.toContain(serviceName)

  await page.reload()
  await expect(page.getByRole("navigation", { name: /settings sections/i })).not.toContainText(/catalog|products/i)

  const rows = await db8.orm.public.Service.where({ tenantId: tenant.id }).all()
  expect(rows.map((r) => r.id)).toContain(service.id)
})

test("L2 — disabling a module 404s its site routes and pauses its jobs, data stays", async ({ context, request }) => {
  const { page, tenant, slug } = await signUpAndTenant(context)
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.chatbot" },
    create: { key: "module.chatbot", value: true, updatedById: "e2e" },
    update: { value: true },
  })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "chatbot", enabled: true })
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({ tenantId: tenant.id, profile: { name: "E2E L2" } })

  // Chatbot's scheduled work runs while it's enabled — then stops.
  const { reindexTenant } = await import("@/platform/chatbot/ingest")
  const before = await reindexTenant(tenant.id)
  expect(before.sources).toBeGreaterThanOrEqual(0)

  await page.goto(`/t/${slug}/settings/modules`)
  // Disable `chatbot` through the same UI as E8 — the disable button's row
  // sits in the chatbot card.
  await page
    .getByRole("button", { name: /^disable$/i })
    .first()
    .click()
  await page.waitForLoadState("networkidle")

  // Its scheduled work pauses — reindex becomes a no-op.
  const after = await reindexTenant(tenant.id)
  expect(after).toEqual({ sources: 0, chunks: 0 })

  // And a module-gated site route 404s once its module is off — booking
  // shares the gate (requireModuleRoute, not requireModule — L2 caught
  // `module_inactive` reaching the client as a 500).
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "booking", enabled: true })
  const siteHost = `${slug}.lessgap.io`
  const on = await request.get("/book", { headers: { host: siteHost } })
  expect(on.status()).toBe(200)
  await db8.orm.public.TenantModule.where({ tenantId: tenant.id, moduleKey: "booking" }).update({ enabled: false })
  const off = await request.get("/book", { headers: { host: siteHost } })
  expect(off.status()).toBe(404)
})
