import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { parseTableQuery, offsetOf, type TableQuerySpec } from "@/lib/table-query"
import { getPlatformSettings } from "@/platform/settings/store"
import { getMigrationStatus } from "@/platform/database/migrate"
import { MIGRATIONS } from "@/generated/migrations"
import { storageConfigured } from "@/platform/storage/r2"
import { DatabaseMigrations } from "@/components/admin/database-migrations"

export const instant = false
export const maxDuration = 300

export default async function AdminDatabaseMigrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) redirect("/dashboard")
  const t = await getTranslations("admin.database")
  const [status, settings] = await Promise.all([getMigrationStatus(), getPlatformSettings()])
  const spec: TableQuerySpec = {
    sortable: ["name"],
    defaultDir: "asc",
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)
  const allMigrations = MIGRATIONS.map((migration) => ({
    name: migration.name,
    status:
      status.state === "unknown"
        ? ("unknown" as const)
        : status.state === "current" || !status.pending.includes(migration.name)
          ? ("applied" as const)
          : ("pending" as const),
  }))
  const matching = allMigrations.filter((migration) => migration.name.toLowerCase().includes(query.q.toLowerCase()))
  const sorted = matching.toSorted((a, b) => a.name.localeCompare(b.name) * (query.dir === "asc" ? 1 : -1))
  const rows = sorted.slice(offsetOf(query), offsetOf(query) + query.pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("migrations.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("migrations.subtitle")}</p>
      </div>
      {status.state === "current" && <p className="text-sm text-muted-foreground">{t("migrations.current.title")}</p>}
      <DatabaseMigrations
        status={status.state}
        pendingCount={status.state === "behind" ? status.pending.length : 0}
        migrations={rows}
        total={matching.length}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        backupFirst={storageConfigured()}
      />
    </div>
  )
}
