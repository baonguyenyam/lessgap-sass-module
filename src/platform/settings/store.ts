import { cacheLife, cacheTag, updateTag } from "next/cache"
import { cache } from "react"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { PLATFORM_SETTINGS_TAG } from "@/platform/settings/cache-tags"
import { readSettings, type PlatformSettings, type SettingKey } from "@/platform/settings/registry"

/**
 * Reading and writing the platform settings.
 *
 * Read on most requests (the time zone and language go into every page), so
 * the rows are cached with `"use cache"` under one tag (spec/adr/0022) and
 * expired by `saveSettings`. The cache also refreshes on its own every minute
 * or so, for a deployment whose instances do not share tag expiry.
 *
 * A read never throws: a database that is unreachable, or not migrated yet on
 * a fresh clone, gives the defaults, and the setup notice explains the rest.
 * The defaults are not cached, so the real values return as soon as the
 * database answers.
 */
async function readRows(): Promise<{ key: string; value: unknown }[]> {
  "use cache"
  cacheTag(PLATFORM_SETTINGS_TAG)
  cacheLife("minutes")
  return db8.orm.public.PlatformSwitch.select("key", "value").all()
}

async function load(): Promise<PlatformSettings> {
  try {
    return readSettings(await readRows())
  } catch (error) {
    console.error("[platform-settings] read failed, using defaults:", error)
    return readSettings([])
  }
}

/** The settings in force, read once per request. */
export const getPlatformSettings = cache(load)

/**
 * Every stored switch by key, including the ones the settings registry does
 * not type, such as `module.<key>` (spec/15-module-system.md). Same cache and
 * the same fallback: nothing is on when the database cannot be read.
 */
export const getPlatformSwitches = cache(async (): Promise<Record<string, unknown>> => {
  try {
    return Object.fromEntries((await readRows()).map((row) => [row.key, row.value]))
  } catch (error) {
    console.error("[platform-settings] read failed, no switches on:", error)
    return {}
  }
})

/**
 * Stores the given values (already validated and authorised by the caller).
 * Called from a server action: `updateTag` makes the next read wait for the
 * new values instead of serving the cached ones.
 */
export async function saveSettings(values: Partial<PlatformSettings>, updatedById: string): Promise<void> {
  for (const [key, value] of Object.entries(values) as [SettingKey, unknown][]) {
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key },
      create: { key, value: value as never, updatedById },
      update: { value: value as never, updatedById, updatedAt: nowTs() },
    })
  }
  updateTag(PLATFORM_SETTINGS_TAG)
}
