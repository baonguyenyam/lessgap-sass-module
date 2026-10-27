import { APP_LOCALES } from "@/platform/settings/registry"

/**
 * The language one person picked from the header for the private area. It
 * outranks the platform default (`locale.app`) and only applies outside
 * `[locale]`: the public site keeps its language in the URL.
 */
export const APP_LOCALE_COOKIE = "app_locale"

export type AppLocale = (typeof APP_LOCALES)[number]

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value)
}
