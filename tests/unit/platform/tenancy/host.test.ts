import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

// Task 3.1: every row of the host-resolution table in spec/03-domains.md.
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { resolveHost, normaliseHost } = await import("@/platform/tenancy/host")
const { SITES_DOMAIN } = await import("@/config/sites")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

const original = { ...process.env }

beforeEach(() => {
  db.reset()
  process.env = { ...original }
})

const active = { id: "t1", slug: "pho", status: "ACTIVE" }
const tenant = (status = "ACTIVE") => db.fn("Tenant.first").mockResolvedValue(status === "ACTIVE" ? active : null)

describe("normaliseHost", () => {
  it("lowercases and strips the port and a trailing dot", () => {
    expect(normaliseHost("PHO.Example.COM:3000.")).toBe("pho.example.com")
  })
})

describe("resolveHost", () => {
  it("platform hosts resolve as platform, not a site", async () => {
    expect(await resolveHost("localhost")).toEqual({ kind: "platform" })
    expect(await resolveHost(`www.${SITES_DOMAIN}`)).toEqual({ kind: "platform" })
    expect(await resolveHost(`app.${SITES_DOMAIN}`)).toEqual({ kind: "platform" })
    expect(await resolveHost(SITES_DOMAIN)).toEqual({ kind: "platform" })
  })

  it("<slug>.<sites-domain> resolves an active tenant", async () => {
    tenant()
    expect(await resolveHost(`pho.${SITES_DOMAIN}`)).toEqual({ kind: "site", tenantId: "t1", slug: "pho" })
  })

  it("a suspended or missing tenant resolves to none", async () => {
    tenant("SUSPENDED")
    expect(await resolveHost(`pho.${SITES_DOMAIN}`)).toEqual({ kind: "none" })
  })

  it("a reserved slug never resolves to a tenant", async () => {
    // `www`/`app` are the platform's own hosts — `platform`, not a tenant.
    for (const slug of ["www", "app"]) {
      expect(await resolveHost(`${slug}.${SITES_DOMAIN}`)).toEqual({ kind: "platform" })
    }
    // The rest are reserved: no tenant may claim the hostname.
    for (const slug of ["api", "admin", "mail", "platform", "dashboard", "sites"]) {
      expect(await resolveHost(`${slug}.${SITES_DOMAIN}`)).toEqual({ kind: "none" })
    }
    expect(db.call("Tenant.first")).toBeUndefined()
  })

  it("a nested subdomain never resolves — only exactly one slug level", async () => {
    expect(await resolveHost(`a.pho.${SITES_DOMAIN}`)).toEqual({ kind: "none" })
  })

  it("an unknown host resolves to none", async () => {
    expect(await resolveHost("somewhere.else.example")).toEqual({ kind: "none" })
  })

  it("DEV_TENANT_HOST_MAP aliases a dev host to a tenant slug", async () => {
    process.env.DEV_TENANT_HOST_MAP = "pho=pho.test"
    tenant()
    expect(await resolveHost("pho.test")).toEqual({ kind: "site", tenantId: "t1", slug: "pho" })
  })

  it("dev aliases win over the platform-host rules but a missing tenant is none", async () => {
    process.env.DEV_TENANT_HOST_MAP = "ghost=ghost.test"
    db.fn("Tenant.first").mockResolvedValue(null)
    expect(await resolveHost("ghost.test")).toEqual({ kind: "none" })
  })
})
