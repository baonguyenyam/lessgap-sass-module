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

/**
 * The best supported language in an `Accept-Language` header, or null:
 * highest quality first, an exact tag before its base (`vi-VN` → `vi`).
 */
export function fromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header) return null
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="))
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) : 1, index }
    })
    .filter((entry) => entry.tag && entry.q > 0 && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q || a.index - b.index)
  for (const { tag } of ranked) {
    if (isAppLocale(tag)) return tag
    const base = tag.split("-")[0]
    if (isAppLocale(base)) return base
  }
  return null
}

/**
 * The language of the private area for one request (phase 0, task 0.13), in
 * order: the language picked on this device (cookie), the person's own saved
 * preference, the browser's languages, then the workspace or platform default.
 */
export function resolveAppLocale(input: {
  cookie: unknown
  preference: unknown
  acceptLanguage: string | null | undefined
  fallback: AppLocale
}): AppLocale {
  if (isAppLocale(input.cookie)) return input.cookie
  if (isAppLocale(input.preference)) return input.preference
  return fromAcceptLanguage(input.acceptLanguage) ?? input.fallback
}
