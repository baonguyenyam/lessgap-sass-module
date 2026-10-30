import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { PaymentsTable, type PaymentRow } from "@/components/payments/payments-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("billing", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "payments"
  )
  const t = await getTranslations("dashboard.payments")
  const settings = await getViewerSettings()
  const [payments, refunds] = await Promise.all([
    db8.orm.public.Payment.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Refund.where({ tenantId: c.tenantId }).all(),
  ])
  const statuses = [...new Set(payments.map((p) => p.status))]
  const spec: TableQuerySpec = {
    sortable: ["createdAt", "amountCents"],
    defaultDir: "desc",
    filters: { status: statuses },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)
  const refundByPayment = new Map<string, number>()
  for (const r of refunds) refundByPayment.set(r.paymentId, (refundByPayment.get(r.paymentId) ?? 0) + r.amountCents)

  let rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    kind: p.kind,
    amountCents: p.amountCents - (refundByPayment.get(p.id) ?? 0),
    currency: p.currency,
    feeCents: p.feeCents,
    status: (refundByPayment.get(p.id) ?? 0) > 0 ? `${p.status} · ${t("refunded")}` : p.status,
    createdAt: p.createdAt,
  }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.kind.toLowerCase().includes(q))
  }
  if (query.filters.status) rows = rows.filter((r) => r.status.startsWith(query.filters.status!))
  rows.sort((a, b) => {
    const dir = query.dir === "asc" ? 1 : -1
    if (query.sort === "amountCents") return dir * (b.amountCents - a.amountCents)
    return dir * b.createdAt.localeCompare(a.createdAt)
  })
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  return (
    <div className="space-y-6">
      <PaymentsTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
        statuses={statuses}
      />
    </div>
  )
}
