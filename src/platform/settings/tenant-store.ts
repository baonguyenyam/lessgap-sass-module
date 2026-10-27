import { cache } from "react"
import { db8 } from "@/lib/db8"
import { getCurrentUser } from "@/lib/auth"
import { nowTs } from "@/lib/timestamps"
import { getMembership } from "@/platform/tenancy/require-member"
import type { PlatformSettings, TenantSettingKey } from "@/platform/settings/registry"
import { getPlatformSettings } from "@/platform/settings/store"
import { mergeTenantSettings } from "@/platform/settings/tenant"
import { mergeUserSettings } from "@/platform/settings/user"

/** One tenant's settings in force, read once per request. */
export const getTenantSettings = cache(async (tenantId: string): Promise<PlatformSettings> => {
  const platform = await getPlatformSettings()
  try {
    const rows = await db8.orm.public.TenantSetting.select("key", "value").where({ tenantId }).all()
    return mergeTenantSettings(platform, rows)
  } catch (error) {
    // Before `pnpm db:migrate` has created the table: the platform values.
    console.error("[tenant-settings] read failed, using platform settings:", error)
    return platform
  }
})

/** A person's own setting rows, read once per request. */
export const getUserSettingRows = cache(async (userId: string): Promise<{ key: string; value: unknown }[]> => {
  try {
    return await db8.orm.public.UserSetting.select("key", "value").where({ userId }).all()
  } catch (error) {
    // Before `pnpm db:migrate` has created the table: nothing of their own.
    console.error("[user-settings] read failed:", error)
    return []
  }
})

/** The settings for whoever is signed in: their own, then their tenant's, then the platform's. */
export const getViewerSettings = cache(async (): Promise<PlatformSettings> => {
  const user = await getCurrentUser()
  if (!user) return getPlatformSettings()
  const member = await getMembership(user.id)
  const base = member ? await getTenantSettings(member.organizationId) : await getPlatformSettings()
  return mergeUserSettings(base, await getUserSettingRows(user.id))
})

/** Stores a person's own values; null removes one, so the workspace's applies again. */
export async function saveUserSettings(userId: string, values: Record<string, unknown>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    if (value === null) {
      await db8.orm.public.UserSetting.where({ userId, key }).delete()
      continue
    }
    await db8.orm.public.UserSetting.upsert({
      conflictOn: { userId, key },
      create: { userId, key, value: value as never },
      update: { value: value as never, updatedAt: nowTs() },
    })
  }
}

export async function saveTenantSettings(
  tenantId: string,
  values: Partial<Pick<PlatformSettings, TenantSettingKey>>,
  updatedById: string
): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    await db8.orm.public.TenantSetting.upsert({
      conflictOn: { tenantId, key },
      create: { tenantId, key, value: value as never, updatedById },
      update: { value: value as never, updatedById, updatedAt: nowTs() },
    })
  }
}
