import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConvertButton } from "@/components/quotes/convert-button"
import { EmptyState } from "@/components/layout/empty-state"
import { FileText } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Quotes (task 6.6): requests, quotes and their status —
 * `convert` turns an accepted quote into an order. */
export default async function QuotesPage() {
  const c = await requireTenantContext("quotes", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "quotes"
  )
  const t = await getTranslations("dashboard.quotes")
  const [requests, quotes] = await Promise.all([
    db8.orm.public.QuoteRequest.where({ tenantId: c.tenantId })
      .orderBy((x) => x.createdAt.desc())
      .all(),
    db8.orm.public.Quote.where({ tenantId: c.tenantId })
      .include("lines")
      .orderBy((x) => x.createdAt.desc())
      .all(),
  ])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("requests", { count: requests.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {requests.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty")} />
          ) : (
            requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>
                  {r.customerName} · {r.customerEmail}
                </span>
                <span className="text-muted-foreground">
                  {r.status} · {toDate(r.createdAt).toUTCString().slice(0, 16)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("quotes", { count: quotes.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotes.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty")} />
          ) : (
            quotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{q.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.lines.map((l) => l.name).join(", ")} · {(q.totalCents / 100).toFixed(2)} · {q.status}
                  </p>
                </div>
                {q.status === "accepted" && <ConvertButton quoteId={q.id} />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
