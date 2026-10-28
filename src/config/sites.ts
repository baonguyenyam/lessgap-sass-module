/**
 * Tenant sites are served at `<slug>.<sites-domain>` (spec/03-domains.md).
 * The deployment names its own domain through the env; the kit's reserved
 * slugs are the platform's own hostnames — a tenant slug must never claim one.
 */
export const SITES_DOMAIN = process.env.SITES_DOMAIN ?? "localhost"

export const RESERVED_SLUGS = [
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "platform",
  "dashboard",
  "sites",
  "assets",
  "static",
] as const

/** `DEV_TENANT_HOST_MAP="pho=pho.test,dental=dental.test"` for custom-domain
 * dev — `resolveHost` treats each right-hand host as an alias of the tenant
 * slug on the left. */
export function devHostMap(env = process.env.DEV_TENANT_HOST_MAP ?? ""): Map<string, string> {
  const map = new Map<string, string>()
  for (const pair of env
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)) {
    const [slug, host] = pair.split("=").map((s) => s.trim().toLowerCase())
    if (slug && host) map.set(host, slug)
  }
  return map
}
