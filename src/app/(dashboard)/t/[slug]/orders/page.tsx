import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { OrdersTable, type OrderRow } from "@/components/orders/orders-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

const STATUSES = ["received", "preparing", "ready", "done"]

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("orders", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "ordering"
  )
  const t = await getTranslations("dashboard.orders")
  const settings = await getViewerSettings()
  const spec: TableQuerySpec = {
    sortable: ["createdAt", "totalCents", "customerName"],
    defaultDir: "desc",
    filters: { status: STATUSES },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const orders = await db8.orm.public.Order.where({ tenantId: c.tenantId }).include("lines").all()
  let rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    items: o.lines.map((l) => `${l.name} ×${l.quantity}`).join(", "),
    totalCents: o.totalCents,
    fulfilment: o.fulfilment,
    status: o.status,
    createdAt: o.createdAt,
  }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.customerName.toLowerCase().includes(q) || r.items.toLowerCase().includes(q))
  }
  if (query.filters.status) rows = rows.filter((r) => r.status === query.filters.status)
  rows.sort((a, b) => {
    const dir = query.dir === "asc" ? 1 : -1
    if (query.sort === "totalCents") return dir * (b.totalCents - a.totalCents)
    if (query.sort === "customerName") return dir * a.customerName.localeCompare(b.customerName)
    return dir * b.createdAt.localeCompare(a.createdAt)
  })
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  return (
    <div className="space-y-6">
      <OrdersTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
        statuses={STATUSES}
      />
    </div>
  )
}
