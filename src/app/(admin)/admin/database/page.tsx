import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { parseTableQuery, offsetOf, type TableQuerySpec } from "@/lib/table-query"
import { getPlatformSettings } from "@/platform/settings/store"
import { getMigrationStatus } from "@/platform/database/migrate"
import { describeMigration } from "@/platform/database/migration-status"
import { BACKUP_PREFIX, backupTakenAt } from "@/platform/database/sql-dump"
import { listObjects, storageConfigured } from "@/platform/storage/r2"
import { DatabaseBackups, type BackupRow } from "@/components/admin/database-backups"
import { DatabaseMigrations } from "@/components/admin/database-migrations"
import { Separator } from "@/components/ui/separator"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false
// A backup or a migration runs inside the server action this page posts to,
// so the page sets the time limit for both (spec/adr/0023).
export const maxDuration = 300

/** Admin → Database: apply pending migrations, take and download backups. ROOT only. */
export default async function AdminDatabasePage({
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

  const status = await getMigrationStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="space-y-4" aria-labelledby="migrations-heading">
        <div>
          <h2 id="migrations-heading" className="text-lg font-semibold">
            {t("migrations.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("migrations.subtitle")}</p>
        </div>
        <DatabaseMigrations
          status={status.state}
          pending={
            status.state === "behind" ? status.pending.map((name) => ({ name, ...describeMigration(name) })) : []
          }
          backupFirst={configured}
        />
      </section>

      <Separator />

      <section className="space-y-4" aria-labelledby="backups-heading">
        <div>
          <h2 id="backups-heading" className="text-lg font-semibold">
            {t("backups.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("backups.subtitle")}</p>
        </div>
        <DatabaseBackups
          configured={configured}
          failed={failed}
          rows={page}
          total={backups.length}
          query={query}
          defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        />
      </section>
    </div>
  )
}
