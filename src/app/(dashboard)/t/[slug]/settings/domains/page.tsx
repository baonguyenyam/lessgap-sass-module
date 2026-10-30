import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DomainActions } from "@/components/settings/domain-actions"
import { EmptyState } from "@/components/layout/empty-state"
import { Globe2 } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Settings → Domains (task 3.7, spec/03): the tenant's custom domains —
 * pending with its DNS records, active as the primary/redirected hostname. */
export default async function DomainsPage() {
  const ctx = await requireTenantContext("settings", "manage")
  const t = await getTranslations("dashboard.settings.domains")
  const domains = await db8.orm.public.Domain.where({ tenantId: ctx.tenantId }).all()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="space-y-4">
        {domains.map((d) => (
          <Card key={d.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">{d.hostname}</CardTitle>
                <CardDescription>{t(`status.${d.status}`)}</CardDescription>
              </div>
              {d.isPrimary && <Badge>{t("primary")}</Badge>}
            </CardHeader>
            <CardContent>
              {d.status === "pending" && (
                <div className="mb-3 space-y-1 font-mono text-xs">
                  {(
                    (d.verification as { records?: { type: string; name: string; value: string }[] })?.records ?? []
                  ).map((r, i) => (
                    <p key={i}>
                      {r.type} {r.name} → {r.value}
                    </p>
                  ))}
                </div>
              )}
              <DomainActions hostname={d.hostname} status={d.status} isPrimary={d.isPrimary} />
            </CardContent>
          </Card>
        ))}
        {domains.length === 0 && <EmptyState icon={Globe2} title={t("empty")} description={t("empty_hint")} />}
      </div>
      <DomainActions add />
    </div>
  )
}
