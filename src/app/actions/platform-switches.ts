"use server"

import { revalidatePath, updateTag } from "next/cache"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { audit, platformAuditContext } from "@/platform/audit"
import { PLATFORM_SETTINGS_TAG } from "@/platform/settings/cache-tags"
import { isSettingKey, parseSettingValue } from "@/platform/settings/registry"
import { saveSettings } from "@/platform/settings/store"
import { requirePlatformRole } from "@/platform/staff"

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
