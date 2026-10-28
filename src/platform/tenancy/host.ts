import { cache } from "react"
import { db8 } from "@/lib/db8"
import { devHostMap, RESERVED_SLUGS, SITES_DOMAIN } from "@/config/sites"

/**
 * What a hostname on this deployment means (spec/03-domains.md, the table):
 * platform hosts → the app/marketing surface, `<slug>.<sites-domain>` → a
 * tenant's site (active only), everything else → a custom `Domain` row
 * (task 3.7) or nothing.
 */
export type ResolvedHost = { kind: "platform" } | { kind: "site"; tenantId: string; slug: string } | { kind: "none" }

/** lowercase, strip port, strip a trailing dot — never trust the header raw. */
export function normaliseHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "")
}

/** The platform's own hostnames: the app and marketing surface, not a site. */
const PLATFORM_HOSTS = new Set(["localhost", "127.0.0.1", "app.", "www.", "api."])
function isPlatformHost(host: string): boolean {
  if (host === SITES_DOMAIN || host === `www.${SITES_DOMAIN}` || host === `app.${SITES_DOMAIN}`) return true
  if (!host.endsWith(`localhost`)) return false
  return PLATFORM_HOSTS.has(host)
}

export const resolveHost = cache(async function resolveHost(rawHost: string): Promise<ResolvedHost> {
  const host = normaliseHost(rawHost)

  // Custom-domain testing on dev hosts (spec/03): `DEV_TENANT_HOST_MAP`
  // aliases the right-hand host to a tenant slug.
  const devSlug = devHostMap().get(host)
  if (devSlug) {
    const tenant = await tenantBySlug(devSlug)
    return tenant ? { kind: "site", tenantId: tenant.id, slug: tenant.slug } : { kind: "none" }
  }

  if (isPlatformHost(host)) return { kind: "platform" }

  // `<slug>.<sites-domain>` — a tenant site. A slug on the reserved list is
  // the platform's own hostname: never a tenant.
  if (host.endsWith(`.${SITES_DOMAIN}`)) {
    const slug = host.slice(0, -`.${SITES_DOMAIN}`.length)
    if (!slug || RESERVED_SLUGS.includes(slug as never) || slug.includes(".")) return { kind: "none" }
    const tenant = await tenantBySlug(slug)
    return tenant ? { kind: "site", tenantId: tenant.id, slug: tenant.slug } : { kind: "none" }
  }

  // A custom `Domain` (task 3.7): `active` status only — a pending or
  // failed domain is not a site.
  const domain = await db8.orm.public.Domain.where({ hostname: host, status: "active" }).first()
  if (domain) {
    const tenant = await db8.orm.public.Tenant.where({ id: domain.tenantId, status: "ACTIVE" })
      .select("id", "slug")
      .first()
    if (tenant) return { kind: "site", tenantId: tenant.id, slug: tenant.slug }
  }
  return { kind: "none" }
})

async function tenantBySlug(slug: string) {
  return db8.orm.public.Tenant.where({ slug, status: "ACTIVE" }).select("id", "slug").first()
}
