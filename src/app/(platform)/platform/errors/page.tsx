import { or } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getPlatformSettings } from "@/platform/settings/store"
import { requirePlatformRole } from "@/platform/staff"
import { ErrorsTable, type ErrorRow } from "@/components/platform/errors-table"

export const instant = false

/** Platform → Errors: ErrorReport digests — one row per group (task 1.13). */
export default async function PlatformErrorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformRole()
  const t = await getTranslations("platform.errors")
  const settings = await getPlatformSettings()

  const { ErrorReport, Tenant } = db8.orm.public
  const sources = [...new Set((await ErrorReport.select("source").all()).map((r) => r.source))].sort()

  const spec: TableQuerySpec = {
    sortable: ["lastSeenAt", "count", "name"],
    defaultDir: "desc",
    filters: { source: sources, resolved: ["open", "resolved"] },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const bySource = query.filters.source ? ErrorReport.where({ source: query.filters.source }) : ErrorReport
  const byResolved =
    query.filters.resolved === "resolved"
      ? bySource.where((r) => r.resolvedAt.isNotNull())
      : query.filters.resolved === "open"
        ? bySource.where((r) => r.resolvedAt.isNull())
        : bySource
  const matching = query.q
    ? byResolved.where((r) => or(r.name.ilike(`%${query.q}%`), r.message.ilike(`%${query.q}%`)))
    : byResolved

  const [count, reports, tenants] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select(
        "id",
        "digest",
        "source",
        "name",
        "message",
        "count",
        "tenantId",
        "firstSeenAt",
        "lastSeenAt",
        "resolvedAt"
      )
      .orderBy((r) => r[query.sort === "count" ? "count" : query.sort === "name" ? "name" : "lastSeenAt"][query.dir]())
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
    Tenant.select("id", "slug").all(),
  ])

  const slugOf = new Map(tenants.map((t) => [t.id, t.slug]))
  const rows: ErrorRow[] = reports.map((r) => ({
    id: r.id,
    digest: r.digest,
    source: r.source,
    name: r.name,
    message: r.message,
    count: r.count,
    tenantSlug: r.tenantId ? (slugOf.get(r.tenantId) ?? null) : null,
    firstSeenAt: toDate(r.firstSeenAt).toISOString(),
    lastSeenAt: toDate(r.lastSeenAt).toISOString(),
    resolvedAt: r.resolvedAt ? toDate(r.resolvedAt).toISOString() : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ErrorsTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        sources={sources}
      />
    </div>
  )
}
