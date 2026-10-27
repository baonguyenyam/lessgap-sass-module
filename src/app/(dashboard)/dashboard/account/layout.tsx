import { getTranslations } from "next-intl/server"
import { SectionLayout, SectionNav } from "@/components/layout/section-nav"
import { ACCOUNT_BASE, ACCOUNT_PAGES } from "@/lib/settings-pages"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Every account page: the title, the vertical sub-navigation, then the page. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("dashboard.account")
  const items = ACCOUNT_PAGES.map((page) => ({
    href: page.href,
    label: t(`nav.${page.key}`),
    segment: page.href.slice(ACCOUNT_BASE.length + 1) || null,
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
