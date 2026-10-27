import { z } from "zod"
import { PAGE_SIZES } from "@/lib/table-query"
import { isRoot, isAdmin, type Role } from "@/lib/roles"

/**
 * Every platform setting: its key, type, default, and who may change it
 * (spec/04-entitlements.md, "Platform switches"; spec/adr/0020-application-stack.md). Values live
 * in the `PlatformSwitch` table, one row per key; a key without a row, or with
 * a value that no longer parses, reads as its default.
 *
 * - `admin`: any ADMIN or ROOT. How the system displays things.
 * - `root`: ROOT only. What the system allows and who it is for.
 */

/** Languages the private area can be shown in: one message file each in src/locales. */
export const APP_LOCALES = ["en", "vi"] as const

const timeZone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value })
    return true
  } catch {
    return false
  }
}, "Unknown time zone")

export const PLATFORM_SETTINGS = {
  "display.page_size": {
    group: "display",
    scope: "admin",
    schema: z.coerce.number().refine((n) => (PAGE_SIZES as readonly number[]).includes(n)),
    default: 20,
  },
  "display.date_style": {
    group: "display",
    scope: "admin",
    schema: z.enum(["short", "medium", "long"]),
    default: "medium",
  },
  "display.hour_cycle": {
    group: "display",
    scope: "admin",
    schema: z.enum(["h12", "h23"]),
    default: "h23",
  },
  "display.time_zone": {
    group: "display",
    scope: "admin",
    schema: timeZone,
    default: "UTC",
  },
  "locale.app": {
    group: "locale",
    scope: "root",
    schema: z.enum(APP_LOCALES),
    default: "en",
  },
  "signup.enabled": {
    group: "access",
    scope: "root",
    schema: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean()),
    default: true,
  },
} as const satisfies Record<
  string,
  { group: "display" | "locale" | "access"; scope: "admin" | "root"; schema: z.ZodType; default: unknown }
>

export type SettingKey = keyof typeof PLATFORM_SETTINGS

/** The platform settings a tenant admin may set for their own tenant. */
export const TENANT_SETTING_KEYS = [
  "locale.app",
  "display.time_zone",
  "display.date_style",
  "display.hour_cycle",
  "display.page_size",
] as const satisfies readonly SettingKey[]

export type TenantSettingKey = (typeof TENANT_SETTING_KEYS)[number]

export const isTenantSettingKey = (key: string): key is TenantSettingKey =>
  (TENANT_SETTING_KEYS as readonly string[]).includes(key)
export type PlatformSettings = { [K in SettingKey]: z.output<(typeof PLATFORM_SETTINGS)[K]["schema"]> }
export const SETTING_KEYS = Object.keys(PLATFORM_SETTINGS) as SettingKey[]

export const isSettingKey = (key: string): key is SettingKey => Object.hasOwn(PLATFORM_SETTINGS, key)

/** The settings in force, from the stored rows: defaults fill every gap. */
export function readSettings(rows: { key: string; value: unknown }[]): PlatformSettings {
  const out = Object.fromEntries(SETTING_KEYS.map((key) => [key, PLATFORM_SETTINGS[key].default])) as PlatformSettings
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue
    const parsed = PLATFORM_SETTINGS[row.key].schema.safeParse(row.value)
    if (parsed.success) (out as Record<string, unknown>)[row.key] = parsed.data
  }
  return out
}

/** Whether `role` may change `key`. ROOT may change everything. */
export function canEditSetting(role: Role | null | undefined, key: SettingKey): boolean {
  return PLATFORM_SETTINGS[key].scope === "root" ? isRoot(role) : isAdmin(role)
}

/** Parses a value for `key` coming from a form; `null` when it is not valid. */
export function parseSettingValue<K extends SettingKey>(key: K, raw: unknown): PlatformSettings[K] | null {
  const parsed = PLATFORM_SETTINGS[key].schema.safeParse(raw)
  return parsed.success ? (parsed.data as PlatformSettings[K]) : null
}

/**
 * The named date formats every page uses, from the display settings:
 * `format.dateTime(date, "date")` and `format.dateTime(date, "dateTime")`.
 * The time zone is applied by next-intl itself (src/i18n/request.ts).
 */
export function dateTimeFormats(settings: Pick<PlatformSettings, "display.date_style" | "display.hour_cycle">) {
  const dateStyle = settings["display.date_style"]
  return {
    date: { dateStyle },
    dateTime: { dateStyle, timeStyle: "short", hourCycle: settings["display.hour_cycle"] },
  } satisfies Record<string, Intl.DateTimeFormatOptions>
}
