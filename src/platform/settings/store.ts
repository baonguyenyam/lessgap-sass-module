import { io } from "next/cache"
import { cache } from "react"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { readSettings, type PlatformSettings, type SettingKey } from "@/platform/settings/registry"

/**
 * Reading and writing the platform settings.
 *
 * Read on most requests (the time zone and language go into every page), so
 * the rows are kept for a few seconds per server process and dropped on save
 * in that process. Another instance sees a change within `TTL_MS`.
 *
 * A read never throws: a database that is unreachable, or not migrated yet on
 * a fresh clone, gives the defaults, and the setup notice explains the rest.
 */
const TTL_MS = 30_000
let cached: { at: number; settings: PlatformSettings } | null = null

async function load(): Promise<PlatformSettings> {
  // Read at request time, never while a page prerenders: the clock below and
  // the ORM's query ids are values Cache Components refuses in a prerender.
  // Step 2 of spec/adr/0022 replaces this cache with `"use cache"` and a tag.
  await io()
  if (cached && Date.now() - cached.at < TTL_MS) return cached.settings
  try {
    const rows = await db8.orm.public.PlatformSwitch.select("key", "value").all()
    cached = { at: Date.now(), settings: readSettings(rows) }
  } catch (error) {
    console.error("[platform-settings] read failed, using defaults:", error)
    return readSettings([])
  }
  return cached.settings
}

/** The settings in force, read once per request. */
export const getPlatformSettings = cache(load)

/** Stores the given values (already validated and authorised by the caller). */
export async function saveSettings(values: Partial<PlatformSettings>, updatedById: string): Promise<void> {
  for (const [key, value] of Object.entries(values) as [SettingKey, unknown][]) {
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key },
      create: { key, value: value as never, updatedById },
      update: { value: value as never, updatedById, updatedAt: nowTs() },
    })
  }
  cached = null
}
