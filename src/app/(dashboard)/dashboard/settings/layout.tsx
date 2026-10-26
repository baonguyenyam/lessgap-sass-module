import { getTranslations } from "next-intl/server"
import { SettingsNav } from "@/components/settings/settings-nav"

/** Every settings page: the title, the sub-navigation, then the page. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("dashboard.settings")

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SettingsNav />
      {children}
    </div>
  )
}
