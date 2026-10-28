import { describe, expect, it } from "vitest"
import { domainProvider, digitalOceanProvider, localProvider, vercelProvider } from "@/platform/domains/provider"

describe("domainProvider (3.7)", () => {
  it("defaults to the local provider without DOMAIN_PROVIDER", () => {
    expect(domainProvider()).toBe(localProvider)
  })
  it("selects vercel and digitalocean by env", () => {
    const saved = process.env.DOMAIN_PROVIDER
    process.env.DOMAIN_PROVIDER = "vercel"
    expect(domainProvider()).toBe(vercelProvider)
    process.env.DOMAIN_PROVIDER = "digitalocean"
    expect(domainProvider()).toBe(digitalOceanProvider)
    process.env.DOMAIN_PROVIDER = saved
  })
  it("local provider reports pending with the sites-domain CNAME", async () => {
    const result = await localProvider.addDomain("example.com")
    expect(result.status).toBe("pending")
    expect(result.records).toEqual([{ type: "CNAME", name: "example.com", value: expect.any(String) }])
  })
})
