import { SITES_DOMAIN } from "@/config/sites"

/** A site's canonical origin (spec/03): `https://<slug>.<sites-domain>` —
 * a custom primary domain replaces it when one exists (task 3.7). */
export function siteOrigin(slug: string): string {
  return SITES_DOMAIN === "localhost" || SITES_DOMAIN.includes(":")
    ? `http://${slug}.${SITES_DOMAIN}`
    : `https://${slug}.${SITES_DOMAIN}`
}
