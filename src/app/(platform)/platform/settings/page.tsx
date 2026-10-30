import { requirePlatformRole } from "@/platform/staff"
import { getPlatformSettings, getPlatformSwitches } from "@/platform/settings/store"
import { PLATFORM_SETTINGS, SETTING_KEYS } from "@/platform/settings/registry"
import { getTranslations } from "next-intl/server"
import { PlatformSettingsTable, type SwitchRow } from "@/components/platform/platform-settings-table"

// Cache Components adoption (spec/adr/0022): this page always reads fresh request data.
export const instant = false

export default async function PlatformSettingsPage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.settings")
  const [typed, raw] = await Promise.all([getPlatformSettings(), getPlatformSwitches()])

  // Registry keys with their effective value and whether a stored row differs
  // from the default — plus every stored row the registry does not type
  // (`feature.*` kill switches, `module.*` states, anything hand-written).
  const known = new Set<string>(SETTING_KEYS)
  const rows: SwitchRow[] = [
    ...SETTING_KEYS.map((key) => ({
      key,
      value: (typed as Record<string, unknown>)[key],
      stored: key in raw ? raw[key] : undefined,
      group: PLATFORM_SETTINGS[key].group,
    })),
    ...Object.entries(raw)
      .filter(([key]) => !known.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value, stored: value, group: "custom" })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <PlatformSettingsTable rows={rows} />
    </div>
  )
}
import { PageHeader } from "@/components/layout/page-header"
