import { getTranslations } from "next-intl/server"
import { SectionLayout, SectionNav } from "@/components/layout/section-nav"
import { SETTINGS_BASE, SETTINGS_PAGES } from "@/lib/settings-pages"

/** Every settings page: the title, the vertical sub-navigation, then the page. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("dashboard.settings")
  const items = SETTINGS_PAGES.map((page) => ({
    href: page.href,
    label: t(`nav.${page.key}`),
    segment: page.href.slice(SETTINGS_BASE.length + 1) || null,
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
