import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/admin/settings-form"
import { ThemePreference } from "@/components/settings/preferences"
import { saveUserSettingsAction } from "@/app/actions/user-settings"
import { settingFields } from "@/platform/settings/fields"
import { getViewerSettings } from "@/platform/settings/tenant-store"
import { USER_SETTING_KEYS } from "@/platform/settings/user"

/** Account → Preferences: this person's language, time and look, over their workspace's. */
export default async function PreferencesPage() {
  const user = await requireUser()
  const t = await getTranslations("dashboard.settings.preferences")
  const [fields, values] = await Promise.all([settingFields(USER_SETTING_KEYS, user.role), getViewerSettings()])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("languageTitle")}</CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            fields={fields.map((field) => ({ ...field, editable: true }))}
            values={values}
            save={saveUserSettingsAction}
          />
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
