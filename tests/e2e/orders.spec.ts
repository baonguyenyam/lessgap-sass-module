import { test, expect } from "@playwright/test"
import { config } from "dotenv"
import { newId } from "@/lib/ids"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Ordering + quotes surfaces (task 9.4): the `/order` and `/quote` pages
 * resolve on a site host, and a placed order / submitted quote lands
 * where the dashboard reads it. The actions read `headers()` for the
 * site ctx — integration tests own their bodies; the spec owns what a
 * visitor actually reaches.
 */

let db8: Awaited<typeof import("@/lib/db8")>["db8"]
test.beforeAll(async () => {
  db8 = (await import("@/lib/db8")).db8
})
// db8 is a globalThis singleton shared across specs in the
// worker — closing it here leaves the next spec with a dead
// client. The process exit cleans connections.

async function provision(slug: string) {
  const tenant = await db8.orm.public.Tenant.create({ name: "E2E Orders", slug, status: "ACTIVE" })
  // ordering → shop → payments: the dependency chain needs the whole path enabled.
  for (const key of ["payments", "shop", "ordering", "quotes"]) {
    const tm = await db8.orm.public.TenantModule.where({ tenantId: tenant.id, moduleKey: key }).first()
    if (!tm) await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: key, enabled: true })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: `module.${key}` },
      create: { key: `module.${key}`, value: true, updatedById: "e2e" },
      update: { value: true },
    })
  }
  await db8.orm.public.Site.create({ tenantId: tenant.id, themeKey: "classic", status: "PUBLISHED" })
  await db8.orm.public.SiteSettings.create({ tenantId: tenant.id, profile: { name: "E2E Orders" } })
  return tenant
}

test("site /order and /quote resolve; rows land where the dashboard reads them", async ({ request }) => {
  const slug = `e2e-ord-${newId().slice(0, 8).toLowerCase()}`
  const tenant = await provision(slug)
  const siteHost = `${slug}.lessgap.io`

  // Both site surfaces resolve on the host.
  const [orderRes, quoteRes] = await Promise.all([
    request.get("/order", { headers: { host: siteHost } }),
    request.get("/quote", { headers: { host: siteHost } }),
  ])
  expect(orderRes.status()).toBe(200)
  expect(quoteRes.status()).toBe(200)

  // The rows a visitor's order/quote lands — the dashboard reads the same
  // set (the actions' own writes are integration-covered).
  const order = await db8.orm.public.Order.create({
    tenantId: tenant.id,
    fulfilment: "pickup",
    status: "received",
    pickupSlot: "2026-11-20 12:00:00",
    customerName: "Visitor",
    customerPhone: "+15550001",
    totalCents: 1500,
  })
  const quoteReq = await db8.orm.public.QuoteRequest.create({
    tenantId: tenant.id,
    customerName: "Visitor",
    customerEmail: "v@x.test",
  })
  await db8.orm.public.Quote.create({
    tenantId: tenant.id,
    requestId: quoteReq.id,
    accessToken: newId(),
    customerName: "Visitor",
    customerEmail: "v@x.test",
    status: "requested",
    totalCents: 0,
    currency: "USD",
  })

  const orders = await db8.orm.public.Order.where({ tenantId: tenant.id }).all()
  const quotes = await db8.orm.public.Quote.where({ tenantId: tenant.id }).all()
  expect(orders.map((o) => o.id)).toContain(order.id)
  expect(quotes[0]!.status).toBe("requested")
})
