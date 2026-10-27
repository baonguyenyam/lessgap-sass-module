import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguagePreference, ThemePreference } from "@/components/settings/preferences"
import { APP_LOCALES } from "@/platform/settings/registry"

/** Settings → Preferences: the language and the look of the app, for this browser. */
export default async function PreferencesPage() {
  await requireUser()
  const t = await getTranslations("dashboard.settings.preferences")

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("languageTitle")}</CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguagePreference locales={APP_LOCALES} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("themeTitle")}</CardTitle>
          <CardDescription>{t("themeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePreference />
        </CardContent>
      </Card>
    </>
  )
}
