import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { parseTableQuery, offsetOf, type TableQuerySpec } from "@/lib/table-query"
import { getPlatformSettings } from "@/platform/settings/store"
import { BACKUP_PREFIX, backupTakenAt } from "@/platform/database/sql-dump"
import { listObjects, storageConfigured } from "@/platform/storage/r2"
import { DatabaseBackups, type BackupRow } from "@/components/admin/database-backups"

export const instant = false
export const maxDuration = 300

export default async function AdminDatabaseBackupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) redirect("/dashboard")
  const t = await getTranslations("admin.database")
  const settings = await getPlatformSettings()
  const spec: TableQuerySpec = {
    sortable: ["takenAt"],
    defaultDir: "desc",
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)
  const configured = storageConfigured()
  let failed = false
  let backups: BackupRow[] = []
  if (configured) {
    try {
      backups = (await listObjects(BACKUP_PREFIX)).flatMap((object) => {
        const takenAt = backupTakenAt(object.key)
        return takenAt ? [{ key: object.key, takenAt: takenAt.toISOString(), size: object.size }] : []
      })
    } catch (error) {
      console.error("[database] listing backups failed:", error)
      failed = true
    }
  }
  if (query.dir === "asc") backups.reverse()
  const page = backups.slice(offsetOf(query), offsetOf(query) + query.pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("backups.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("backups.subtitle")}</p>
      </div>
      <DatabaseBackups
        configured={configured}
        failed={failed}
        rows={page}
        total={backups.length}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
      />
    </div>
  )
}
