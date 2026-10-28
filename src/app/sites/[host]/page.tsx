import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { resolveTheme } from "@/themes/registry"
import type { SiteData } from "@/themes/types"

/**
 * A tenant's public site (task 3.1, theme in 3.5): the host resolves to a
 * tenant; the tenant's `themeKey` resolves to a theme (fallback `main`),
 * which renders the assembled `SiteData`.
 */
export default async function SitePage() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()

  const tenant = await db8.orm.public.Tenant.where({ id: resolved.tenantId }).first()
  if (!tenant) notFound()
  const [site, settings] = await Promise.all([
    db8.orm.public.Site.where({ tenantId: tenant.id }).first(),
    db8.orm.public.SiteSettings.where({ tenantId: tenant.id }).first(),
  ])

  const data: SiteData = {
    tenant: { name: tenant.name, slug: tenant.slug },
    site: {
      themeKey: site?.themeKey ?? "main",
      tokens: site?.tokens,
      sections: site?.sections,
      status: site?.status ?? "DRAFT",
    },
    settings: {
      profile: (settings?.profile as SiteData["settings"]["profile"]) ?? {},
      hours: (settings?.hours as Record<string, string>) ?? {},
      appearance: (settings?.appearance as { accentColor?: string }) ?? {},
    },
  }

  const theme = resolveTheme(data.site.themeKey)
  const Page = theme.pages["home"] ?? Object.values(theme.pages)[0]
  const Layout = theme.layout
  return (
    <Layout data={data}>
      <Page data={data} />
    </Layout>
  )
}
