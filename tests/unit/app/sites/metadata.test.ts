import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const resolved = vi.fn()
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "x.test" }) }))
vi.mock("next/server", () => ({ connection: async () => {} }))
vi.mock("@/platform/tenancy/host", () => ({ resolveHost: (...args: unknown[]) => resolved(...args) }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
vi.mock("@/platform/tenancy/site-origin", () => ({ siteOrigin: (slug: string) => `https://${slug}.lessgap.io` }))

const { GET: robotsGet } = await import("@/app/sites/robots.txt/route")
const { GET: sitemapGet } = await import("@/app/sites/sitemap.xml/route")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  resolved.mockReset()
})

describe("per-host robots.txt (3.6)", () => {
  it("a site host allows crawling and links its sitemap", async () => {
    resolved.mockResolvedValue({ kind: "site", tenantId: "t1", slug: "pho" })
    const res = await robotsGet()
    const body = await res.text()
    expect(body).toContain("Allow: /")
    expect(body).toContain("Sitemap: https://pho.lessgap.io/sitemap.xml")
  })
  it("a non-site host disallows everything", async () => {
    resolved.mockResolvedValue({ kind: "none" })
    expect(await (await robotsGet()).text()).toBe("User-agent: *\nDisallow: /\n")
  })
})

describe("per-host sitemap.xml (3.6)", () => {
  it("a site host lists its origin and published pages", async () => {
    resolved.mockResolvedValue({ kind: "site", tenantId: "t1", slug: "pho" })
    db.fn("Page.all").mockResolvedValue([
      { key: "about", updatedAt: "2026-10-28 10:00:00.000" },
      { key: "services", updatedAt: "2026-10-28 10:00:00.000" },
    ])
    const res = await sitemapGet()
    const body = await res.text()
    expect(body).toContain("<loc>https://pho.lessgap.io/</loc>")
    expect(body).toContain("<loc>https://pho.lessgap.io/about</loc>")
    expect(body).toContain("<loc>https://pho.lessgap.io/services</loc>")
  })
  it("a non-site host 404s", async () => {
    resolved.mockResolvedValue({ kind: "none" })
    expect((await sitemapGet()).status).toBe(404)
  })
})
