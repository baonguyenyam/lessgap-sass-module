import { cacheLife, cacheTag, updateTag } from "next/cache"
import { cache } from "react"
import { db8 } from "@/lib/db8"
import { platformDb } from "@/platform/db"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import { getCurrentUser } from "@/lib/auth"
import { nowTs } from "@/lib/timestamps"
import { getMembership } from "@/platform/tenancy/require-member"
import { tenantSettingsTag, userSettingsTag } from "@/platform/settings/cache-tags"
import type { PlatformSettings, TenantSettingKey } from "@/platform/settings/registry"
import { getPlatformSettings } from "@/platform/settings/store"
import { mergeTenantSettings } from "@/platform/settings/tenant"
import { mergeUserSettings } from "@/platform/settings/user"

type SettingRow = { key: string; value: unknown }

/*
 * The rows are cached on the server with `"use cache"`, keyed by the tenant or
 * person id they belong to and tagged with it (spec/adr/0022), and the save
 * functions below expire their own tag. The ids are arguments, never read from
 * the session inside the cache. A failed read throws out of the cache, so a
 * fallback is never cached.
 */
async function readTenantRows(tenantId: string): Promise<SettingRow[]> {
  "use cache"
  cacheTag(tenantSettingsTag(tenantId))
  cacheLife("minutes")
  // The platform client: cached across requests for one tenant id, outside any
  // tenant's transaction, so it reads past RLS (task 1.5) by design.
  return platformDb.orm.public.TenantSetting.select("key", "value").where({ tenantId }).all()
}

async function readUserRows(userId: string): Promise<SettingRow[]> {
  "use cache"
  cacheTag(userSettingsTag(userId))
  cacheLife("minutes")
  return db8.orm.public.UserSetting.select("key", "value").where({ userId }).all()
}

/** One tenant's settings in force, read once per request. */
export const getTenantSettings = cache(async (tenantId: string): Promise<PlatformSettings> => {
  const platform = await getPlatformSettings()
  try {
    return mergeTenantSettings(platform, await readTenantRows(tenantId))
  } catch (error) {
    // Before `pnpm db:migrate` has created the table: the platform values.
    console.error("[tenant-settings] read failed, using platform settings:", error)
    return platform
  }
})

/** A person's own setting rows, read once per request. */
export const getUserSettingRows = cache(async (userId: string): Promise<SettingRow[]> => {
  try {
    return await readUserRows(userId)
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

/**
 * Stores a person's own values; null removes one, so the workspace's applies
 * again. Called from a server action, which `updateTag` requires.
 */
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
  updateTag(userSettingsTag(userId))
}

/** Stores a tenant's values. Called from a server action, which `updateTag` requires. */
export async function saveTenantSettings(
  tenantId: string,
  values: Partial<Pick<PlatformSettings, TenantSettingKey>>,
  updatedById: string
): Promise<void> {
  // Through the scoped client (task 1.5): the transaction carries app.tenant_id.
  await tenantDb({ tenantId, actor: { kind: "member", userId: updatedById, role: "" } }, async (db) => {
    for (const [key, value] of Object.entries(values)) {
      await db.TenantSetting.upsert({
        conflictOn: { tenantId, key },
        create: { key, value: value as never, updatedById } as never,
        update: { value: value as never, updatedById, updatedAt: nowTs() },
      })
    }
  })
  updateTag(tenantSettingsTag(tenantId))
}
