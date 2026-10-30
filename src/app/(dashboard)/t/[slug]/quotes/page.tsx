import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { PageHeader } from "@/components/layout/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestsTable, QuotesTable, type RequestRow, type QuoteRow } from "@/components/quotes/quotes-tables"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("quotes", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "quotes"
  )
  const t = await getTranslations("dashboard.quotes")
  const settings = await getViewerSettings()
  const params = await searchParams
  const reqSpec: TableQuerySpec = {
    prefix: "req.",
    sortable: ["createdAt", "customerName"],
    defaultDir: "desc",
    defaultPageSize: settings["display.page_size"],
  }
  const qSpec: TableQuerySpec = {
    prefix: "q.",
    sortable: ["createdAt", "totalCents", "customerName"],
    defaultDir: "desc",
    defaultPageSize: settings["display.page_size"],
  }
  const reqQuery = parseTableQuery(params, reqSpec)
  const qQuery = parseTableQuery(params, qSpec)

  const [requests, quotes] = await Promise.all([
    db8.orm.public.QuoteRequest.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Quote.where({ tenantId: c.tenantId }).include("lines").all(),
  ])

  const reqRows: RequestRow[] = requests.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    status: r.status,
    createdAt: r.createdAt,
  }))
  const qRows: QuoteRow[] = quotes.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    items: r.lines.map((l) => l.name).join(", "),
    totalCents: r.totalCents,
    status: r.status,
    createdAt: r.createdAt,
  }))

  const apply = <T extends { customerName: string; status: string; createdAt: string; totalCents?: number }>(
    rows: T[],
    query: typeof reqQuery
  ) => {
    if (query.q) {
      const q = query.q.toLowerCase()
      rows = rows.filter((r) => r.customerName.toLowerCase().includes(q))
    }
    rows.sort((a, b) => {
      const dir = query.dir === "asc" ? 1 : -1
      if (query.sort === "customerName") return dir * a.customerName.localeCompare(b.customerName)
      if (query.sort === "totalCents") return dir * ((b.totalCents ?? 0) - (a.totalCents ?? 0))
      return dir * b.createdAt.localeCompare(a.createdAt)
    })
    const total = rows.length
    return { rows: rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), total }
  }
  const req = apply(reqRows, reqQuery)
  const quo = apply(qRows, qQuery)

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">{t("requests")}</TabsTrigger>
          <TabsTrigger value="quotes">{t("quotes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-4">
          <RequestsTable rows={req.rows} total={req.total} query={reqQuery} />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <QuotesTable rows={quo.rows} total={quo.total} query={qQuery} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
