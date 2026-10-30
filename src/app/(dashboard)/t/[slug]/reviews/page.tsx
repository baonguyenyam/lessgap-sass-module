import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { PageHeader } from "@/components/layout/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewsTable, type ReviewRow } from "@/components/reviews/reviews-table"
import { WaitlistTable, type WaitlistRow } from "@/components/waitlist/waitlist-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("bookings", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.reviews")
  const settings = await getViewerSettings()
  const params = await searchParams
  const rSpec: TableQuerySpec = {
    prefix: "r.",
    sortable: ["rating"],
    defaultDir: "desc",
    filters: { status: ["pending", "published", "rejected"] },
    defaultPageSize: settings["display.page_size"],
  }
  const wSpec: TableQuerySpec = {
    prefix: "w.",
    sortable: ["wantedDate"],
    defaultDir: "asc",
    defaultPageSize: settings["display.page_size"],
  }
  const rQuery = parseTableQuery(params, rSpec)
  const wQuery = parseTableQuery(params, wSpec)

  const [reviews, waiting] = await Promise.all([
    db8.orm.public.Review.where({ tenantId: c.tenantId }).include("customer").all(),
    db8.orm.public.WaitlistEntry.where({ tenantId: c.tenantId }).all(),
  ])

  let rRows: ReviewRow[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    customerName: (r.customer as { name?: string } | null)?.name ?? null,
    body: r.body,
    status: r.status,
  }))
  let wRows: WaitlistRow[] = waiting.map((x) => ({
    id: x.id,
    wantedDate: x.wantedDate,
    contact: x.email ?? x.phone ?? "",
    status: x.status,
  }))

  if (rQuery.q) {
    const q = rQuery.q.toLowerCase()
    rRows = rRows.filter(
      (r) => (r.customerName ?? "").toLowerCase().includes(q) || (r.body ?? "").toLowerCase().includes(q)
    )
  }
  if (rQuery.filters.status) rRows = rRows.filter((r) => r.status === rQuery.filters.status)
  rRows.sort((a, b) => (rQuery.dir === "asc" ? 1 : -1) * (b.rating - a.rating))
  const rTotal = rRows.length
  rRows = rRows.slice((rQuery.page - 1) * rQuery.pageSize, rQuery.page * rQuery.pageSize)

  if (wQuery.q) {
    const q = wQuery.q.toLowerCase()
    wRows = wRows.filter((r) => r.contact.toLowerCase().includes(q) || r.wantedDate.includes(q))
  }
  wRows.sort((a, b) => (wQuery.dir === "desc" ? -1 : 1) * a.wantedDate.localeCompare(b.wantedDate))
  const wTotal = wRows.length
  wRows = wRows.slice((wQuery.page - 1) * wQuery.pageSize, wQuery.page * wQuery.pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">{t("title")}</TabsTrigger>
          <TabsTrigger value="waitlist">{t("waitlist")}</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsTable rows={rRows} total={rTotal} query={rQuery} />
        </TabsContent>
        <TabsContent value="waitlist" className="mt-4">
          <WaitlistTable
            rows={wRows}
            total={wTotal}
            query={wQuery}
            statuses={[...new Set(waiting.map((x) => x.status))]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
