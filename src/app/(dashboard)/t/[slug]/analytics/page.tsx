import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { BarChart3 } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Analytics (task 8.7): the tenant's site page views —
 * top paths and the last 14 days' total. */
export default async function AnalyticsPage() {
  const c = await requireTenantContext("settings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "analytics"
  )
  const t = await getTranslations("dashboard.analytics")
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
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
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
      {top.length === 0 ? (
        <EmptyState icon={BarChart3} title={t("empty")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("top_paths", { count: top.length })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {top.map(([path, count]) => (
              <div key={path} className="flex items-center justify-between text-sm">
                <span>{path}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
