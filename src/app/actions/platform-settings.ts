"use server"

import { revalidatePath, updateTag } from "next/cache"
import { getTranslations } from "next-intl/server"
import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { audit, platformAuditContext } from "@/platform/audit"
import { PLATFORM_SETTINGS_TAG } from "@/platform/settings/cache-tags"
import { canEditSetting, isSettingKey, parseSettingValue, type PlatformSettings } from "@/platform/settings/registry"
import { saveSettings } from "@/platform/settings/store"
import { requirePlatformRole } from "@/platform/staff"

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

const SETTINGS_PATH = "/platform/settings"
const FREE_KEY = /^(feature|module)\.[a-z0-9_.]+$/i

/**
 * Writes one platform switch (spec/04-entitlements.md, "Platform switches").
 * A typed setting goes through its registry schema first; `feature.<key>` and
 * `module.<key>` are untyped by design and take a JSON value. Every write is
 * audited — the row names staff and the value they set, so the console stays
 * operable without touching the database.
 */
export async function setPlatformSwitch(key: string, value: unknown): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.settings.errors")
  const trimmed = key.trim()
  if (!trimmed) return { error: t("keyRequired") }

  if (isSettingKey(trimmed)) {
    const parsed = parseSettingValue(trimmed, value)
    if (parsed === null) return { error: t("invalidValue") }
    await saveSettings({ [trimmed]: parsed } as never, user.id)
  } else if (FREE_KEY.test(trimmed)) {
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: trimmed },
      create: { key: trimmed, value: value as never, updatedById: user.id },
      update: { value: value as never, updatedById: user.id },
    })
    updateTag(PLATFORM_SETTINGS_TAG)
  } else {
    return { error: t("unknownKey") }
  }

  await audit(platformAuditContext(user.id), {
    action: "platform.switch.updated",
    targetType: "switch",
    targetId: trimmed,
    data: { value: value as never },
  })
  revalidatePath(SETTINGS_PATH, "page")
  return {}
}
