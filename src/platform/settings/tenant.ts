import { isTenantSettingKey, parseSettingValue, type PlatformSettings } from "@/platform/settings/registry"

/**
 * The settings in force for one tenant: the platform values, with the tenant's
 * own rows on top. Rows for keys a tenant may not set, or whose value no
 * longer parses, are ignored rather than trusted.
 */
export function mergeTenantSettings(
  platform: PlatformSettings,
  rows: { key: string; value: unknown }[]
): PlatformSettings {
  const out: Record<string, unknown> = { ...platform }
  for (const row of rows) {
    if (!isTenantSettingKey(row.key)) continue
    const value = parseSettingValue(row.key, row.value)
    if (value !== null) out[row.key] = value
  }
  return out as PlatformSettings
}
