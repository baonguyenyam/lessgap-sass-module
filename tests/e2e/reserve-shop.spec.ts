import { test, expect } from "@playwright/test"
import { config } from "dotenv"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Reservation + shop surfaces (post-10 sweep): the `/reserve` and `/shop`
 * pages resolve on a site host. Both share the booking/ordering pattern —
 * the actions read `headers()` for the site ctx, so the spec owns what a
 * visitor actually reaches; the action bodies are integration-covered.
 */

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
})
test.afterAll(async () => {
  await db8.close()
})

async function provision(slug: string) {
  const tenant = await db8.orm.public.Tenant.create({ name: "E2E Surface", slug, status: "ACTIVE" })
  for (const key of ["reservations", "shop"]) {
    const tm = await db8.orm.public.TenantModule.where({ tenantId: tenant.id, moduleKey: key }).first()
    if (!tm) await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: key, enabled: true })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: `module.${key}` },
      create: { key: `module.${key}`, value: true, updatedById: "e2e" },
      update: { value: true },
    })
  }
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({ tenantId: tenant.id, profile: { name: "E2E Surface" } })
  return tenant
}

test("site /reserve and /shop resolve on the host", async ({ request }) => {
  const slug = `e2e-sur-${newId().slice(0, 8).toLowerCase()}`
  await provision(slug)
  const siteHost = `${slug}.lessgap.io`
  const [reserve, shop] = await Promise.all([
    request.get("/reserve", { headers: { host: siteHost } }),
    request.get("/shop", { headers: { host: siteHost } }),
  ])
  expect(reserve.status()).toBe(200)
  expect(shop.status()).toBe(200)
})
