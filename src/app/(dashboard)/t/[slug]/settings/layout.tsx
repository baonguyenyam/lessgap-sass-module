import { Boxes, CreditCard, Globe, Globe2, Languages, Monitor, SlidersHorizontal } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { SectionLayout, SectionNav } from "@/components/layout/section-nav"
import { settingsPages } from "@/lib/settings-pages"
import { isModuleActive } from "@/platform/modules/runtime"
import { grantedPermissions } from "@/platform/tenancy/permissions"
import { requireTenantContext } from "@/platform/tenancy/require-member"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

const ICONS: Record<string, React.ReactNode> = {
  general: <SlidersHorizontal />,
  site: <Globe />,
  domains: <Globe2 />,
  modules: <Boxes />,
  payments: <CreditCard />,
  localization: <Languages />,
  display: <Monitor />,
}

/**
 * Every settings page (platform.madelab.io's settings layout): the title, the
 * grouped menu on the left, the page on the right. The menu offers only the
 * pages that open for this member: their permission, and the module a page
 * belongs to.
 */
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ctx = await requireTenantContext()
  const t = await getTranslations("dashboard.settings")
  const permissions = await grantedPermissions(ctx.tenantId, ctx.member.role)
  const actor = { kind: "member" as const, userId: ctx.user.id, role: ctx.member.role }
  const pages = []
  for (const page of settingsPages(slug)) {
    if (page.permission && !permissions.includes(page.permission as never)) continue
    if (page.module && !(await isModuleActive({ tenantId: ctx.tenantId, actor }, page.module))) continue
    pages.push(page)
  }
  const items = pages.map((page) => ({
    href: page.href,
    label: t(`nav.${page.key}`),
    segment: page.segment,
    icon: ICONS[page.key],
    group: t(`groups.${page.group}`),
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SectionLayout nav={<SectionNav items={items} label={t("nav.label")} />}>{children}</SectionLayout>
    </div>
  )
}
