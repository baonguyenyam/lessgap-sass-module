import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackupActions } from "@/components/platform/backup-actions"

/** Platform → Backups (task 8.4): every `TenantSnapshot` — status, row
 * counts, size — plus request and restore-to-new actions per tenant. */
export default async function PlatformBackupsPage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.backups")
  const [snapshots, tenants, nightly] = await Promise.all([
    db8.orm.public.TenantSnapshot.include("tenant")
      .orderBy((x) => x.createdAt.desc())
      .all(),
    db8.orm.public.Tenant.where({ status: "ACTIVE" }).all(),
    db8.orm.public.Job.where({ kind: "platform.tenant.snapshot_nightly" })
      .orderBy((x) => x.createdAt.desc())
      .first(),
  ])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("nightly")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {nightly
              ? t("nightly_last", { at: toDate(nightly.updatedAt).toUTCString().slice(0, 16), status: nightly.status })
              : t("nightly_never")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("request")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="flex items-center justify-between text-sm">
              <span>
                {tenant.name} <span className="text-muted-foreground">({tenant.slug})</span>
              </span>
              <BackupActions tenantId={tenant.id} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("snapshots", { count: snapshots.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  {s.tenant?.name ?? s.tenantId} · {s.status} ·{" "}
                  {Object.values((s.rowCounts as Record<string, number>) ?? {}).reduce((a, b) => a + b, 0)} {t("rows")}{" "}
                  · {Math.round(s.sizeBytes / 1024)} KB · {toDate(s.createdAt).toUTCString().slice(0, 16)}
                </span>
                {s.status === "done" && s.r2Key && <BackupActions snapshotId={s.id} restore />}
                {s.status === "done" && s.r2Key && <BackupActions snapshotId={s.id} inPlace />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
