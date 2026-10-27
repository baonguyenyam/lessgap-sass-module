"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { getCurrentUser } from "@/lib/auth"
import { canEditSetting, isSettingKey, parseSettingValue, type PlatformSettings } from "@/platform/settings/registry"
import { saveSettings } from "@/platform/settings/store"

/**
 * Saves platform settings from Admin → Settings. Every key is checked on its
 * own: it must exist, the caller must be allowed to change it (display
 * settings: ADMIN or ROOT; the rest: ROOT), and its value must parse. One bad
 * key refuses the whole save, so a form never half-applies.
 */
export async function savePlatformSettings(values: Record<string, unknown>): Promise<{ error?: string }> {
  const viewer = await getCurrentUser()
  if (!viewer) throw new Error("Unauthorized")
  const t = await getTranslations("admin.settings")

  const parsed: Partial<PlatformSettings> = {}
  for (const [key, raw] of Object.entries(values)) {
    if (!isSettingKey(key)) return { error: t("errors.unknown") }
    if (!canEditSetting(viewer.role, key)) return { error: t("errors.forbidden") }
    const value = parseSettingValue(key, raw)
    if (value === null) return { error: t("errors.invalid") }
    ;(parsed as Record<string, unknown>)[key] = value
  }
  if (Object.keys(parsed).length === 0) return {}

  await saveSettings(parsed, viewer.id)
  // The language, the time zone and the date formats show on every page.
  revalidatePath("/", "layout")
  return {}
}
