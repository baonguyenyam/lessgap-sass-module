import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { routing } from "./routing"
import { isKitSite } from "@/config/kit"
import { collapseMessages, type Messages } from "./collapse"
import { getPlatformSettings } from "@/platform/settings/store"
import { dateTimeFormats } from "@/platform/settings/registry"
import { APP_LOCALE_COOKIE, isAppLocale } from "./app-locale"

/**
 * Fills the gaps in `translated` with `source`, all the way down.
 *
 * A shallow merge would not do: a partial `it.json` that defines `nav.pricing`
 * would replace the whole `nav` object and take every sibling key with it,
 * so translating one string would silently blank the others. The merge has to
 * walk the tree.
 */
function withFallback(source: Messages, translated: Messages): Messages {
  const out: Messages = { ...source }
  for (const [key, value] of Object.entries(translated)) {
    const base = out[key]
    const mergeable =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base &&
      typeof base === "object" &&
      !Array.isArray(base)
    out[key] = mergeable ? withFallback(base as Messages, value as Messages) : value
  }
  return out
}

/**
 * Loads the message file for the requested locale.
 *
 * **English is the source and is always complete.** Any key missing from
 * another locale falls back to English rather than rendering an empty string
 * or the key itself, so a partial translation is honest instead of broken.
 * That is what makes it reasonable to ship a locale covering only part of the
 * site: translate the pages that matter to you and leave the rest.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const settings = await getPlatformSettings()
  // The public site carries its locale in the URL. Everything outside it (the
  // dashboard, the admin panel, the sign-in pages) speaks the language picked
  // from the header, or else the platform default (`locale.app`, ROOT only).
  const picked = hasLocale(routing.locales, requested) ? null : (await cookies()).get(APP_LOCALE_COOKIE)?.value
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : isAppLocale(picked)
      ? picked
      : settings["locale.app"]
  // Every date on every page is shown in one time zone and one style, set by
  // an administrator (`display.*`).
  // `now` is fixed per request and handed to the browser with the messages, so
  // a relative time ("2 minutes ago") renders the same on both sides.
  const shared = {
    timeZone: settings["display.time_zone"],
    formats: { dateTime: dateTimeFormats(settings) },
    now: new Date(),
  }

  const source: Messages = (await import(`../locales/${routing.defaultLocale}.json`)).default
  if (locale === routing.defaultLocale) {
    return { locale, ...shared, messages: collapseMessages(source, isKitSite) as never }
  }

  const translated: Messages = (await import(`../locales/${locale}.json`)).default
  return { locale, ...shared, messages: collapseMessages(withFallback(source, translated), isKitSite) as never }
})
