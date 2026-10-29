import { notFound } from "next/navigation"
import { ChatBubble } from "@/components/chatbot/chat-bubble"
import { headers } from "next/headers"
import { cacheLife, cacheTag } from "next/cache"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { siteOrigin } from "@/platform/tenancy/site-origin"
import { primaryDomain } from "@/platform/domains"
import { localBusinessJsonLd } from "@/lib/structured-data"
import { resolveTheme } from "@/themes/registry"
import type { SiteData } from "@/themes/types"

/**
 * A tenant's public site (task 3.1, theme in 3.5): the host resolves to a
 * tenant; the tenant's `themeKey` resolves to a theme (fallback `main`),
 * which renders the assembled `SiteData`.
 */
/** The site's data, cached under `site:<tenant>` — `saveSiteSettings` calls
 * `updateTag` on that tag, so an edit is live within a minute (task 3.6). */
async function getSiteData(tenantId: string): Promise<SiteData | null> {
  "use cache"
  cacheTag(`site:${tenantId}`)
  cacheLife("minutes")
  const tenant = await db8.orm.public.Tenant.where({ id: tenantId }).first()
  if (!tenant) return null
  const [site, settings, moduleOn, teamOn, chatbotOn, chatbotFeature] = await Promise.all([
    db8.orm.public.Site.where({ tenantId }).first(),
    db8.orm.public.SiteSettings.where({ tenantId }).first(),
    db8.orm.public.TenantModule.where({ tenantId, moduleKey: "catalog", enabled: true }).first(),
    db8.orm.public.TenantModule.where({ tenantId, moduleKey: "team", enabled: true }).first(),
    db8.orm.public.TenantModule.where({ tenantId, moduleKey: "chatbot", enabled: true }).first(),
    db8.orm.public.PlatformSwitch.where({ key: "feature.chatbot" }).first(),
  ])
  const catalog = moduleOn
    ? {
        categories: (await db8.orm.public.ServiceCategory.where({ tenantId }).all()).map((x) => ({
          id: x.id,
          name: x.name,
          sortOrder: x.sortOrder,
        })),
        services: (await db8.orm.public.Service.where({ tenantId, status: "active" }).all()).map((x) => ({
          id: x.id,
          name: x.name,
          description: x.description,
          durationMinutes: x.durationMinutes,
          priceCents: x.priceCents,
          currency: x.currency,
          categoryId: x.categoryId,
          imageKey: x.imageKey,
        })),
      }
    : undefined
  const team = teamOn
    ? (await db8.orm.public.StaffMember.where({ tenantId }).all()).map((x) => ({
        id: x.id,
        name: x.name,
        photo: x.photo,
        bio: x.bio,
      }))
    : undefined
  return {
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
    catalog,
    team,
    chatbotEnabled: chatbotOn != null && chatbotFeature?.value !== false,
  }
}

export default async function SitePage() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()

  const data = await getSiteData(resolved.tenantId)
  if (!data) notFound()

  const theme = resolveTheme(data.site.themeKey)
  const Page = theme.pages["home"] ?? Object.values(theme.pages)[0]
  const Layout = theme.layout
  const jsonLd = localBusinessJsonLd({
    name: data.settings.profile.name ?? data.tenant.name,
    tagline: data.settings.profile.tagline,
    phone: data.settings.profile.phone,
    email: data.settings.profile.email,
    address: data.settings.profile.address,
    origin: siteOrigin(data.tenant.slug, await primaryDomain(resolved.tenantId)),
  })
  return (
    <Layout data={data}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Page data={data} />
      {data.chatbotEnabled && <ChatBubble />}
    </Layout>
  )
}
