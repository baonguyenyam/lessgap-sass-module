import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/layout/empty-state"
import { Gauge, ListChecks } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Platform → Usage (task 8.5): usage counters, job throughput, error
 * rate, queue depth — rows, not log lines. */
function computeMetrics(
  jobs: Awaited<ReturnType<typeof db8.orm.public.Job.all>>,
  errors: Awaited<ReturnType<typeof db8.orm.public.ErrorReport.all>>
) {
  const now = Date.now()
  const day = 24 * 3600 * 1000
  const jobsDay = jobs.filter((j) => now - toDate(j.createdAt).getTime() < day)
  const queued = jobs.filter((j) => j.status === "QUEUED")
  const failed = jobs.filter((j) => j.status === "FAILED")
  const errorsDay = errors.filter((e) => now - toDate(e.lastSeenAt).getTime() < day)
  const errorCount = errorsDay.reduce((a, e) => a + e.count, 0)
  return { jobsDay, queued, failed, errorCount }
}
export default async function PlatformUsagePage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.usage")
  const [counters, jobs, errors] = await Promise.all([
    db8.orm.public.UsageCounter.include("tenant").all(),
    db8.orm.public.Job.all(),
    db8.orm.public.ErrorReport.all(),
  ])
  const { jobsDay, queued, failed, errorCount } = computeMetrics(jobs, errors)
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
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
      <Tabs defaultValue="counters">
        <TabsList>
          <TabsTrigger value="counters">{t("counters")}</TabsTrigger>
          <TabsTrigger value="job_kinds">{t("job_kinds")}</TabsTrigger>
        </TabsList>
        <TabsContent value="counters" className="mt-4">
          {counters.length === 0 ? (
            <EmptyState icon={Gauge} title={t("counters_empty")} description={t("counters_empty_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-1 pt-6">
                {counters.slice(0, 50).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span>
                      {c.tenant.name} · {c.limitKey}
                    </span>
                    <span className="text-muted-foreground">
                      {c.used} · {toDate(c.periodStart).toUTCString().slice(5, 16)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="job_kinds" className="mt-4">
          {jobsDay.length === 0 ? (
            <EmptyState icon={ListChecks} title={t("job_kinds_empty")} description={t("job_kinds_empty_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-1 pt-6">
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
import { PageHeader } from "@/components/layout/page-header"
