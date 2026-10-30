import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getPlatformSettings } from "@/platform/settings/store"
import { requirePlatformRole } from "@/platform/staff"
import { JobsTable, type JobRow } from "@/components/platform/jobs-table"
import { JOB_STATUSES } from "@/lib/job-status"

export const instant = false

/** Platform → Jobs: the work queue — due, running and failed runs (task 1.13). */
export default async function PlatformJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformRole()
  const t = await getTranslations("platform.jobs")
  const settings = await getPlatformSettings()

  const { Job } = db8.orm.public
  const kinds = [...new Set((await Job.select("kind").all()).map((j) => j.kind))].sort()

  const spec: TableQuerySpec = {
    sortable: ["runAt", "createdAt", "kind"],
    defaultDir: "desc",
    filters: { status: JOB_STATUSES, kind: kinds },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const statusFilter = query.filters.status ? Job.where({ status: query.filters.status as JobRow["status"] }) : Job
  const kindFilter = query.filters.kind ? statusFilter.where({ kind: query.filters.kind }) : statusFilter
  const matching = query.q ? kindFilter.where((j) => j.kind.ilike(`%${query.q}%`)) : kindFilter

  const [count, jobs] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "kind", "status", "runAt", "attempts", "maxAttempts", "lastError", "tenantId", "finishedAt")
      .orderBy((j) =>
        j[query.sort === "kind" ? "kind" : query.sort === "createdAt" ? "createdAt" : "runAt"][query.dir]()
      )
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
  ])

  const rows: JobRow[] = jobs.map((j) => ({
    id: j.id,
    kind: j.kind,
    status: j.status,
    runAt: toDate(j.runAt).toISOString(),
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    lastError: j.lastError,
    tenantId: j.tenantId,
    finishedAt: j.finishedAt ? toDate(j.finishedAt).toISOString() : null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <JobsTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        kinds={kinds}
      />
    </div>
  )
}
import { PageHeader } from "@/components/layout/page-header"
