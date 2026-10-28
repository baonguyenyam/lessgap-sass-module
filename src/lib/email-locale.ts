import { isAppLocale, type AppLocale } from "@/i18n/app-locale"
import { db8 } from "@/lib/db8"
import { getPlatformSettings } from "@/platform/settings/store"
import { getUserSettingRows } from "@/platform/settings/tenant-store"

/**
 * The language to write to someone in (phase 0, task 0.13): the account's own
 * saved preference (`locale.app`) when the address belongs to a member, else
 * the platform default. Emails are sent from webhooks and auth callbacks, which
 * carry no browser language, so the preference has to come from the database.
 */
export async function recipientLocale(email: string): Promise<AppLocale> {
  const fallback = (await getPlatformSettings())["locale.app"]
  try {
    const user = await db8.orm.public.User.select("id").where({ email: email.trim().toLowerCase() }).first()
    if (!user) return fallback
    const own = (await getUserSettingRows(user.id)).find((row) => row.key === "locale.app")?.value
    return isAppLocale(own) ? own : fallback
  } catch (error) {
    // Language is a nicety: a failed lookup must never stop a password reset.
    console.error("[email] recipient language lookup failed:", error)
    return fallback
  }
}
