import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {latest.length === 0 ? (
        <EmptyState icon={CircleCheck} title={t("no_drift")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("drift", { count: latest.length })}</CardTitle>
          </CardHeader>
          <CardContent>
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
      {domains.length === 0 ? (
        <EmptyState icon={Globe2} title={t("rows_empty")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("rows", { count: domains.length })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
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
    </div>
  )
}
