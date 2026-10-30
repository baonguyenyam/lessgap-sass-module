import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TopPathsTable, type PathRow } from "@/components/analytics/top-paths-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Analytics (task 8.7): the tenant's site page views —
 * top paths and the last 14 days' total. */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("settings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "analytics"
  )
  const t = await getTranslations("dashboard.analytics")
  const settings = await getViewerSettings()
  const spec: TableQuerySpec = {
    sortable: ["views", "path"],
    defaultDir: "desc",
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)
  const views = await db8.orm.public.SitePageView.where({ tenantId: c.tenantId })
    .orderBy((x) => x.count.desc())
    .all()
  const last14 = views
    .filter((v) => new Date().getTime() - new Date(`${v.date}T00:00:00Z`).getTime() < 14 * 24 * 3600 * 1000)
    .reduce((a, v) => a + v.count, 0)
  const top = [
    ...views
      .reduce((acc, v) => {
        const cur = acc.get(v.path) ?? 0
        acc.set(v.path, cur + v.count)
        return acc
      }, new Map<string, number>())
      .entries(),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("views_14d")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{last14}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("paths_tracked")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{new Set(views.map((v) => v.path)).size}</p>
          </CardContent>
        </Card>
      </div>
      {(() => {
        let rows: PathRow[] = top.map(([path, count]) => ({ path, views: count }))
        if (query.q) {
          const q = query.q.toLowerCase()
          rows = rows.filter((r) => r.path.toLowerCase().includes(q))
        }
        rows.sort((a, b) => {
          const dir = query.dir === "asc" ? 1 : -1
          if (query.sort === "path") return dir * a.path.localeCompare(b.path)
          return dir * (b.views - a.views)
        })
        const total = rows.length
        rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        return <TopPathsTable rows={rows} total={total} query={query} />
      })()}
    </div>
  )
}
