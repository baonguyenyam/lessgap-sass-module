import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { getMigrationStatus } from "@/platform/database/migrate"
import { MIGRATIONS } from "@/generated/migrations"
import { storageConfigured } from "@/platform/storage/r2"
import { DatabaseMigrations } from "@/components/admin/database-migrations"

export const instant = false
export const maxDuration = 300

export default async function AdminDatabaseMigrationsPage() {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) redirect("/dashboard")
  const t = await getTranslations("admin.database")
  const status = await getMigrationStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("migrations.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("migrations.subtitle")}</p>
      </div>
      <DatabaseMigrations
        status={status.state}
        pendingCount={status.state === "behind" ? status.pending.length : 0}
        migrations={MIGRATIONS.map((migration) => ({
          name: migration.name,
          status:
            status.state === "unknown"
              ? "unknown"
              : status.state === "current" || !status.pending.includes(migration.name)
                ? "applied"
                : "pending",
        }))}
        backupFirst={storageConfigured()}
      />
    </div>
  )
}
