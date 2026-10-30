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

export const NOTIFICATION_CATEGORIES = [
  { key: "security", emailRequired: true },
  { key: "workspace", emailRequired: false },
  { key: "appointments", emailRequired: false },
  { key: "orders", emailRequired: false },
  { key: "billing", emailRequired: true },
  { key: "product_updates", emailRequired: false },
  { key: "tips", emailRequired: false },
] as const

export const NOTIFICATION_CHANNELS = ["in_app", "email"] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["key"]
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
export type NotificationKey = `notify.${NotificationCategory}.${NotificationChannel}`

const notificationKeys = NOTIFICATION_CATEGORIES.flatMap(({ key }) =>
  NOTIFICATION_CHANNELS.map((channel) => `notify.${key}.${channel}` as const)
)

export const isNotificationKey = (key: string): key is NotificationKey =>
  notificationKeys.includes(key as NotificationKey)

export const isRequiredNotificationKey = (key: NotificationKey) =>
  key.endsWith(".email") &&
  NOTIFICATION_CATEGORIES.some(({ key: category, emailRequired }) =>
    emailRequired ? key === `notify.${category}.email` : false
  )

/** Every channel starts on; legacy email-only choices remain effective. */
export function readNotifications(
  rows: { key: string; value: unknown }[]
): Record<NotificationCategory, Record<NotificationChannel, boolean>> {
  const out = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map(({ key }) => [key, { in_app: true, email: true }])
  ) as Record<NotificationCategory, Record<NotificationChannel, boolean>>
  for (const row of rows) {
    if (typeof row.value !== "boolean") continue
    if (isNotificationKey(row.key)) {
      const [, category, channel] = row.key.split(".") as [string, NotificationCategory, NotificationChannel]
      out[category][channel] = row.value
    } else if (row.key === "notify.product_updates" || row.key === "notify.tips") {
      const category = row.key.slice("notify.".length) as "product_updates" | "tips"
      out[category].email = row.value
    }
  }
  for (const { key, emailRequired } of NOTIFICATION_CATEGORIES) if (emailRequired) out[key].email = true
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
