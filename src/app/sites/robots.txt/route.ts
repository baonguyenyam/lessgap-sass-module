import { headers } from "next/headers"
import { resolveHost } from "@/platform/tenancy/host"
import { siteOrigin } from "@/platform/tenancy/site-origin"

/**
 * A tenant site's `robots.txt` (task 3.6): the proxy rewrites `/robots.txt`
 * on a site host here — allow the site and point crawlers at its sitemap.
 * A non-site host never reaches this route (the proxy 404s it).
 */
export async function GET() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") {
    return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } })
  }
  const origin = siteOrigin(resolved.slug)
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain" },
  })
}
