import { test, expect, type BrowserContext } from "@playwright/test"
import { config } from "dotenv"
import { freshEmail } from "./fresh-email"
import { TENANT_HOME } from "./urls"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Revalidation (task 9.5, D7): saving site settings updates the cached
 * site within seconds. `getSiteData` caches under `site:<tenantId>` —
 * `saveSiteSettings` calls `updateTag`, and the spec proves it end-to-end
 * through the real settings form.
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

async function signUpAndTenant(context: BrowserContext) {
  const email = freshEmail("rev")
  const slug = `e2e-rev-${newId().slice(0, 8).toLowerCase()}`
  const { user } = await auth.api.signUpEmail({ body: { email, password, name: "E2E" } })
  const tenant = await auth.api.createOrganization({ body: { name: "E2E Rev", slug, userId: user.id } })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  const page = await context.newPage()
  await page.goto("/login")
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"][type="password"]').fill(password)
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(TENANT_HOME, { timeout: 20_000 })
  return { page, tenant, slug }
}

test("saving site settings revalidates the published site (D7)", async ({ context, request }) => {
  const { page, tenant, slug } = await signUpAndTenant(context)
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({ tenantId: tenant.id, profile: { name: "Before Name" } })

  // Warm the site's cache — the first render sees the old name.
  const siteHost = `${slug}.lessgap.io`
  const before = await request.get("/", { headers: { host: siteHost } })
  expect(await before.text()).toContain("Before Name")

  // Save new settings through the real form — updateTag drops the cache.
  await page.goto(`/t/${slug}/settings/site`)
  await page.locator('input[name="name"]').fill("After Name")
  await page.getByRole("button", { name: /save/i }).click()
  await page.waitForLoadState("networkidle")

  const res = await request.get("/", { headers: { host: siteHost } })
  const html = await res.text()
  expect(html).toContain("After Name")
  expect(html).not.toContain("Before Name")
})
