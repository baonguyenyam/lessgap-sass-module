import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** Platform → Usage (task 8.5): usage counters, job throughput, error
 * rate, queue depth — rows, not log lines. */
export default async function PlatformUsagePage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.usage")
  const [counters, jobs, errors, tenants] = await Promise.all([
    db8.orm.public.UsageCounter.include("tenant").all(),
    db8.orm.public.Job.all(),
    db8.orm.public.ErrorReport.all(),
    db8.orm.public.Tenant.where({ status: "ACTIVE" }).all(),
  ])
  const now = Date.now()
  const day = 24 * 3600 * 1000
  const jobsDay = jobs.filter((j) => now - toDate(j.createdAt).getTime() < day)
  const queued = jobs.filter((j) => j.status === "QUEUED")
  const failed = jobs.filter((j) => j.status === "FAILED")
  const errorsDay = errors.filter((e) => now - toDate(e.lastSeenAt).getTime() < day)
  const errorCount = errorsDay.reduce((a, e) => a + e.count, 0)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("queue_depth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{queued.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("jobs_24h")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{jobsDay.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("failed_jobs")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{failed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("errors_24h")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{errorCount}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("counters", { count: counters.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {counters.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("counters_empty")}</p>
          ) : (
            counters.slice(0, 50).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>
                  {c.tenant.name} · {c.limitKey}
                </span>
                <span className="text-muted-foreground">
                  {c.used} · {toDate(c.periodStart).toUTCString().slice(5, 16)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("job_kinds")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(
            jobsDay.reduce<Record<string, number>>((acc, j) => {
              acc[j.kind] = (acc[j.kind] ?? 0) + 1
              return acc
            }, {})
          ).map(([kind, count]) => (
            <div key={kind} className="flex items-center justify-between text-sm">
              <span>{kind}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
