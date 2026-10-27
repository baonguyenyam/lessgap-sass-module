"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { setAppLocale } from "@/app/actions/locale"
import { requireUser } from "@/lib/auth"
import { parseSettingValue } from "@/platform/settings/registry"
import { saveUserSettings } from "@/platform/settings/tenant-store"
import { isNotificationKey, isUserSettingKey } from "@/platform/settings/user"

/** Account → Preferences: language, time zone and date format for this person. */
export async function saveUserSettingsAction(values: Record<string, unknown>): Promise<{ error?: string }> {
  const user = await requireUser()
  const tAdmin = await getTranslations("admin.settings")
  const parsed: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values)) {
    if (!isUserSettingKey(key)) return { error: tAdmin("errors.unknown") }
    const value = parseSettingValue(key, raw)
    if (value === null) return { error: tAdmin("errors.invalid") }
    parsed[key] = value
  }
  await saveUserSettings(user.id, parsed)
  // The locale cookie outranks the stored value, so keep it in step.
  if (typeof parsed["locale.app"] === "string") await setAppLocale(parsed["locale.app"])
  revalidatePath("/dashboard", "layout")
  return {}
}

/** Account → Notifications: one email kind on or off. */
export async function saveNotification(key: string, enabled: boolean): Promise<{ error?: string }> {
  const user = await requireUser()
  const tNotify = await getTranslations("dashboard.account.notifications")
  if (!isNotificationKey(key) || typeof enabled !== "boolean") return { error: tNotify("failed") }
  await saveUserSettings(user.id, { [key]: enabled })
  revalidatePath("/dashboard/account/notifications")
  return {}
}
