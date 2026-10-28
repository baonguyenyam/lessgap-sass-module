import { SITES_DOMAIN } from "@/config/sites"

/** A site's canonical origin (spec/03): `https://<slug>.<sites-domain>`,
 * or the tenant's primary custom domain when one is set (task 3.7). */
export function siteOrigin(slug: string, primaryHostname?: string | null): string {
  if (primaryHostname) return `https://${primaryHostname}`
  return SITES_DOMAIN === "localhost" || SITES_DOMAIN.includes(":")
    ? `http://${slug}.${SITES_DOMAIN}`
    : `https://${slug}.${SITES_DOMAIN}`
}
