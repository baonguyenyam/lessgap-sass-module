import { SITES_DOMAIN } from "@/config/sites"

/**
 * The domain provider (decision 3-A): a deployment's host-specific API the
 * `Domain` lifecycle calls — add the hostname, check verification, remove.
 * `VercelDomainProvider` for test/preview, `DigitalOceanDomainProvider` for
 * production, `LocalDomainProvider` as the dev default (no API calls).
 */
export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string }
export type ProviderResult = { status: "pending" | "active" | "failed"; records: DnsRecord[] }

export interface DomainProvider {
  addDomain(hostname: string): Promise<ProviderResult>
  checkDomain(hostname: string): Promise<ProviderResult>
  removeDomain(hostname: string): Promise<void>
  /** Reconciliation needs the provider's own view (task 8.2); a provider
   * without a list endpoint skips the daily diff instead of guessing. */
  listDomains?(): Promise<string[]>
}

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? ""
const VERCEL_PROJECT = process.env.VERCEL_PROJECT_ID ?? ""
const VERCEL_TEAM = process.env.VERCEL_TEAM_ID ?? ""

async function vercelApi(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.vercel.com${path}${VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : ""}`, {
    ...init,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
  })
  if (!res.ok) throw new Error(`vercel ${path}: ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

/** Vercel project domains API (spec/03 step 2). */
export const vercelProvider: DomainProvider = {
  async addDomain(hostname) {
    await vercelApi(`/v10/projects/${VERCEL_PROJECT}/domains`, {
      method: "POST",
      body: JSON.stringify({ name: hostname }),
    })
    return this.checkDomain(hostname)
  },
  async checkDomain(hostname) {
    const data = await vercelApi(`/v9/projects/${VERCEL_PROJECT}/domains/${hostname}/verify`, { method: "POST" })
    const verified = data.verified === true
    const records: DnsRecord[] = hostname.includes(".")
      ? hostname.split(".").length > 2 || hostname.startsWith("www.")
        ? [{ type: "CNAME", name: hostname, value: "cname.vercel-dns.com" }]
        : [{ type: "A", name: hostname, value: "76.76.21.21" }]
      : []
    return { status: verified ? "active" : "pending", records }
  },
  async removeDomain(hostname) {
    await vercelApi(`/v9/projects/${VERCEL_PROJECT}/domains/${hostname}`, { method: "DELETE" })
  },
  async listDomains() {
    const data = await vercelApi(`/v9/projects/${VERCEL_PROJECT}/domains`, { method: "GET" })
    const domains = (data.domains as { name: string }[] | undefined) ?? []
    return domains.map((d) => d.name)
  },
}

/** DigitalOcean — production host (decision 3-A). */
export const digitalOceanProvider: DomainProvider = {
  async addDomain(hostname) {
    const res = await fetch("https://api.digitalocean.com/v2/domains", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.DO_API_TOKEN ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: hostname }),
    })
    if (!res.ok && res.status !== 422) throw new Error(`do domains: ${res.status}`)
    return { status: "pending", records: [{ type: "CNAME", name: hostname, value: `${SITES_DOMAIN}` }] }
  },
  async checkDomain(hostname) {
    // A DO-hosted domain is live once its CNAME/A record resolves to the
    // sites domain — the `platform.domain.verify` job polls this.
    return { status: "pending", records: [{ type: "CNAME", name: hostname, value: `${SITES_DOMAIN}` }] }
  },
  async removeDomain(hostname) {
    const res = await fetch(`https://api.digitalocean.com/v2/domains/${hostname}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.DO_API_TOKEN ?? ""}` },
    })
    if (!res.ok && res.status !== 404) throw new Error(`do domains delete: ${res.status}`)
  },
  async listDomains() {
    const res = await fetch("https://api.digitalocean.com/v2/domains", {
      headers: { Authorization: `Bearer ${process.env.DO_API_TOKEN ?? ""}` },
    })
    if (!res.ok) throw new Error(`do domains list: ${res.status}`)
    const data = (await res.json()) as { domains?: { name: string }[] }
    return (data.domains ?? []).map((d) => d.name)
  },
}

/** Dev default — no API calls; records only show what to point where. */
export const localProvider: DomainProvider = {
  async addDomain(hostname) {
    return { status: "pending", records: [{ type: "CNAME", name: hostname, value: `${SITES_DOMAIN}` }] }
  },
  async checkDomain(hostname) {
    return this.addDomain(hostname)
  },
  async removeDomain() {},
}

/** `DOMAIN_PROVIDER=vercel|digitalocean` selects the real API; dev defaults
 * to `local`. */
export function domainProvider(): DomainProvider {
  switch (process.env.DOMAIN_PROVIDER) {
    case "vercel":
      return vercelProvider
    case "digitalocean":
      return digitalOceanProvider
    default:
      return localProvider
  }
}
