import { headers } from "next/headers"
import { connection } from "next/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { resolveHost } from "@/platform/tenancy/host"
import { siteOrigin } from "@/platform/tenancy/site-origin"
import { primaryDomain } from "@/platform/domains"

/**
 * A tenant site's `sitemap.xml` (task 3.6): the home page plus every
 * published `Page` row, all at the site's canonical origin.
 */
export async function GET() {
  await connection()
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") return new Response("Not found", { status: 404 })
  const origin = siteOrigin(resolved.slug, await primaryDomain(resolved.tenantId))
  const pages = await db8.orm.public.Page.where({ tenantId: resolved.tenantId, status: "published" }).all()
  const urls = [
    `<url><loc>${origin}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`,
    ...pages.map(
      (p) =>
        `<url><loc>${origin}/${p.key}</loc><lastmod>${toDate(p.updatedAt).toISOString().slice(0, 10)}</lastmod></url>`
    ),
  ]
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("\n")}</urlset>`,
    {
      headers: { "Content-Type": "application/xml" },
    }
  )
}
