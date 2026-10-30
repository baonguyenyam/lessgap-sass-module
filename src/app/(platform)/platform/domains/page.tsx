import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/layout/empty-state"
import { CircleCheck, Globe2 } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Platform → Domains (task 8.2): the latest reconcile run's drift rows —
 * a Domain the provider lost ("missing_provider") or a provider hostname
 * no row claims ("extra_provider") — plus every Domain row's status. */
export default async function PlatformDomainsPage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.domains")
  const [domains, checks] = await Promise.all([
    db8.orm.public.Domain.include("tenant").all(),
    db8.orm.public.DomainCheck.orderBy((x) => x.createdAt.desc()).all(),
  ])
  const latestRun = checks[0]?.runId
  const latest = latestRun ? checks.filter((c) => c.runId === latestRun) : []
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Tabs defaultValue="drift">
        <TabsList>
          <TabsTrigger value="drift">{t("drift")}</TabsTrigger>
          <TabsTrigger value="rows">{t("rows")}</TabsTrigger>
        </TabsList>
        <TabsContent value="drift" className="mt-4">
          {latest.length === 0 ? (
            <EmptyState tone="success" icon={CircleCheck} title={t("no_drift")} description={t("no_drift_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-2 pt-6">
                {latest.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span>{c.hostname}</span>
                    <span className="text-muted-foreground">
                      {t(`kind.${c.kind}`)} · {toDate(c.createdAt).toUTCString().slice(0, 16)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="rows" className="mt-4">
          {domains.length === 0 ? (
            <EmptyState icon={Globe2} title={t("rows_empty")} description={t("rows_empty_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-1 pt-6">
                {domains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span>
                      {d.hostname} <span className="text-muted-foreground">({d.tenant.slug})</span>
                    </span>
                    <span className="text-muted-foreground">
                      {d.status}
                      {d.isPrimary ? ` · ${t("primary")}` : ""}
                    </span>
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
