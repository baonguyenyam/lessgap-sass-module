import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/admin/settings-form"
import { settingFields, SETTINGS_TABS } from "@/platform/settings/fields"
import { getPlatformSettings } from "@/platform/settings/store"

/** One tab of Admin → Settings: its card and its form. */
export async function SettingsTab({ tab }: { tab: (typeof SETTINGS_TABS)[number]["key"] }) {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) redirect("/dashboard")
  const t = await getTranslations("admin.settings")
  const { settings: keys } = SETTINGS_TABS.find((entry) => entry.key === tab)!
  const [fields, values] = await Promise.all([settingFields(keys, viewer.role), getPlatformSettings()])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`tabs.${tab}`)}</CardTitle>
        <CardDescription>{t(`descriptions.${tab}`)}</CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm fields={fields} values={values} />
      </CardContent>
    </Card>
  )
}
