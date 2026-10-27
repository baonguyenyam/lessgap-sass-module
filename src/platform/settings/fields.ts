import { getTranslations } from "next-intl/server"
import { languageName } from "@/i18n/language-name"
import type { Role } from "@/lib/roles"
import { PAGE_SIZES } from "@/lib/table-query"
import type { SettingField } from "@/components/admin/settings-form"
import { APP_LOCALES, canEditSetting, type SettingKey } from "@/platform/settings/registry"

/** The tabs of Admin → Settings, in order, and the settings each holds. */
export const SETTINGS_TABS = [
  {
    segment: null,
    key: "display",
    settings: ["display.page_size", "display.date_style", "display.hour_cycle", "display.time_zone"],
  },
  { segment: "language", key: "language", settings: ["locale.app"] },
  { segment: "access", key: "access", settings: ["signup.enabled"] },
] as const satisfies readonly { segment: string | null; key: string; settings: readonly SettingKey[] }[]

/** The form fields of one tab, labelled, with the options each select offers. */
export async function settingFields(keys: readonly SettingKey[], role: Role): Promise<SettingField[]> {
  const t = await getTranslations("admin.settings.fields")
  const sample = new Date(Date.UTC(2026, 9, 27, 15, 5))

  const options: Partial<Record<SettingKey, { value: string; label: string }[]>> = {
    "display.page_size": PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) })),
    "display.date_style": (["short", "medium", "long"] as const).map((style) => ({
      value: style,
      label: new Intl.DateTimeFormat("en-US", { dateStyle: style, timeZone: "UTC" }).format(sample),
    })),
    "display.hour_cycle": (["h23", "h12"] as const).map((cycle) => ({
      value: cycle,
      label: new Intl.DateTimeFormat("en-US", { timeStyle: "short", hourCycle: cycle, timeZone: "UTC" }).format(sample),
    })),
    "display.time_zone": Intl.supportedValuesOf("timeZone").map((zone) => ({ value: zone, label: zone })),
    "locale.app": APP_LOCALES.map((locale) => ({ value: locale, label: languageName(locale) })),
  }

  return keys.map((key) => ({
    key,
    label: t(`${key}.label`),
    description: t(`${key}.description`),
    kind: key === "signup.enabled" ? "switch" : "select",
    options: options[key],
    editable: canEditSetting(role, key),
  }))
}
