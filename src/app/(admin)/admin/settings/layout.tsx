import type { Route } from "next"
import { getTranslations } from "next-intl/server"
import { SectionLayout, SectionNav } from "@/components/layout/section-nav"
import { SETTINGS_TABS } from "@/platform/settings/fields"

/** Admin → Settings: the platform settings, one vertical tab per group. */
export default async function PlatformSettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("admin.settings")
  const items = SETTINGS_TABS.map((tab) => ({
    href: (tab.segment ? `/admin/settings/${tab.segment}` : "/admin/settings") as Route,
    label: t(`tabs.${tab.key}`),
    segment: tab.segment,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SectionLayout nav={<SectionNav items={items} label={t("tabsLabel")} />}>{children}</SectionLayout>
    </div>
  )
}
