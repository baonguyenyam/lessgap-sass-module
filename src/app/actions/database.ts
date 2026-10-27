"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { isRoot } from "@/lib/roles"
import { createBackup } from "@/platform/database/backup"
import { applyMigrations } from "@/platform/database/migrate"
import { BACKUP_PREFIX, backupTakenAt } from "@/platform/database/sql-dump"
import { presignDownload, storageConfigured } from "@/platform/storage/r2"

/**
 * Admin → Database (spec/adr/0023). ROOT only, checked here again even though
 * the page checks too: an action is a public endpoint.
 */

const PAGE = "/admin/database"
/** The word typed to confirm a migration; checked here, not only in the dialog. */
const CONFIRM_WORD = "MIGRATE"

async function requireRoot() {
  const user = await getCurrentUser()
  if (!user || !isRoot(user.role)) throw new Error("Unauthorized")
  return user
}

export async function backUpDatabase(): Promise<{ error?: string }> {
  const user = await requireRoot()
  const t = await getTranslations("admin.database.errors")
  if (!storageConfigured()) return { error: t("noStorage") }
  // A backup reads every table: a speed bump against a stuck button or a loop.
  if (!(await checkRateLimit(`db-backup:${user.id}`, 10, 60 * 60 * 1000))) return { error: t("rate") }
  try {
    const result = await createBackup(user.id)
    console.info(`[database] backup ${result.key} (${result.size} bytes, ${result.rows} rows) by ${user.id}`)
  } catch (error) {
    console.error("[database] backup failed:", error)
    return { error: t("backupFailed") }
  }
  revalidatePath(PAGE)
  return {}
}

export async function backupDownloadUrl(key: unknown): Promise<{ url?: string; error?: string }> {
  await requireRoot()
  const t = await getTranslations("admin.database.errors")
  const parsed = z.string().safeParse(key)
  // Only keys this feature wrote: the action never signs a link to anything else in the bucket.
  if (!parsed.success || !backupTakenAt(parsed.data)) return { error: t("notFound") }
  return { url: await presignDownload(parsed.data, parsed.data.slice(BACKUP_PREFIX.length)) }
}

export async function applyDatabaseMigrations(
  confirmation: unknown
): Promise<{ error?: string; applied?: string[]; backedUp?: boolean }> {
  const user = await requireRoot()
  const t = await getTranslations("admin.database.errors")
  if (confirmation !== CONFIRM_WORD) return { error: t("confirm") }

  const result = await applyMigrations(user.id)
  revalidatePath(PAGE)
  if (result.ok) return { applied: result.applied, backedUp: result.backupKey !== null }
  switch (result.reason) {
    case "locked":
      return { error: t("locked") }
    case "unknown-state":
      return { error: t("unknownState") }
    case "no-storage":
      return { error: t("noStorageForMigrate") }
    case "backup-failed":
      return { error: t("backupFailed") }
    case "migrate-failed":
      return { error: t("migrateFailed", { code: result.code ?? "unknown" }) }
  }
}
