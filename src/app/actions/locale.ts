"use server"

import { cookies } from "next/headers"
import { APP_LOCALE_COOKIE, isAppLocale } from "@/i18n/app-locale"

const ONE_YEAR = 60 * 60 * 24 * 365

/** The header's language switch: remembered per browser, for a year. */
export async function setAppLocale(locale: string) {
  if (!isAppLocale(locale)) return
  ;(await cookies()).set(APP_LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" })
}
