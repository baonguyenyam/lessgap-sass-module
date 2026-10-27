import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/admin/settings-form"
import { saveTenantSettingsAction } from "@/app/actions/tenant-settings"
import { settingFields } from "@/platform/settings/fields"
import type { TenantSettingKey } from "@/platform/settings/registry"
import { getTenantSettings } from "@/platform/settings/tenant-store"
import { memberCan } from "@/platform/tenancy/permissions"
import { requireTenantContext } from "@/platform/tenancy/require-member"

const TABS = {
  localization: ["locale.app", "display.time_zone", "display.date_style", "display.hour_cycle"],
  display: ["display.page_size"],
} as const satisfies Record<string, readonly TenantSettingKey[]>

/** A tenant settings tab: platform setting fields, saved for this tenant only. */
export async function TenantSettingsTab({ tab }: { tab: keyof typeof TABS }) {
  const ctx = await requireTenantContext()
  const t = await getTranslations("dashboard.settings.tenant")
  const [fields, values, canManage] = await Promise.all([
    settingFields(TABS[tab], ctx.user.role),
    getTenantSettings(ctx.tenantId),
    memberCan(ctx.tenantId, ctx.member.role, "settings", "manage"),
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`${tab}Title`)}</CardTitle>
        <CardDescription>{t(`${tab}Description`)}</CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm
          fields={fields.map((field) => ({ ...field, editable: canManage }))}
          values={values}
          save={saveTenantSettingsAction}
          readOnlyNote={t("readOnly")}
        />
      </CardContent>
    </Card>
  )
}
