import { parseSettingValue, type PlatformSettings, type SettingKey } from "@/platform/settings/registry"

/** The settings a person may set for themselves, over their workspace's. */
export const USER_SETTING_KEYS = [
  "locale.app",
  "display.time_zone",
  "display.date_style",
  "display.hour_cycle",
] as const satisfies readonly SettingKey[]

export type UserSettingKey = (typeof USER_SETTING_KEYS)[number]

export const isUserSettingKey = (key: string): key is UserSettingKey =>
  (USER_SETTING_KEYS as readonly string[]).includes(key)

/** Emails a person may turn off. Security and billing emails are always sent. */
export const NOTIFICATION_KEYS = ["notify.product_updates", "notify.tips"] as const
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number]

export const isNotificationKey = (key: string): key is NotificationKey =>
  (NOTIFICATION_KEYS as readonly string[]).includes(key)

/** Notification choices from the stored rows: every email is on until turned off. */
export function readNotifications(rows: { key: string; value: unknown }[]): Record<NotificationKey, boolean> {
  const out = Object.fromEntries(NOTIFICATION_KEYS.map((key) => [key, true])) as Record<NotificationKey, boolean>
  for (const row of rows) if (isNotificationKey(row.key) && typeof row.value === "boolean") out[row.key] = row.value
  return out
}

/** A person's own rows over the settings in force for them; bad rows are ignored. */
export function mergeUserSettings(base: PlatformSettings, rows: { key: string; value: unknown }[]): PlatformSettings {
  const out: Record<string, unknown> = { ...base }
  for (const row of rows) {
    if (!isUserSettingKey(row.key)) continue
    const value = parseSettingValue(row.key, row.value)
    if (value !== null) out[row.key] = value
  }
  return out as PlatformSettings
}
