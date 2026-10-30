import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { ReservationsTable, type ReservationRow } from "@/components/reservations/reservations-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("bookings", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "reservations"
  )
  const t = await getTranslations("dashboard.reservations")
  const settings = await getViewerSettings()
  const reservations = await db8.orm.public.Reservation.where({ tenantId: c.tenantId }).include("table").all()
  const statuses = [...new Set(reservations.map((r) => r.status))]
  const spec: TableQuerySpec = {
    sortable: ["startTs", "name", "partySize"],
    defaultDir: "asc",
    filters: { status: statuses },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  let rows: ReservationRow[] = reservations.map((r) => ({
    id: r.id,
    name: r.name,
    partySize: r.partySize,
    tableName: r.table?.name ?? null,
    status: r.status,
    startTs: r.startTs,
  }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.name.toLowerCase().includes(q))
  }
  if (query.filters.status) rows = rows.filter((r) => r.status === query.filters.status)
  rows.sort((a, b) => {
    const dir = query.dir === "desc" ? -1 : 1
    if (query.sort === "partySize") return dir * (a.partySize - b.partySize)
    if (query.sort === "name") return dir * a.name.localeCompare(b.name)
    return dir * a.startTs.localeCompare(b.startTs)
  })
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  return (
    <div className="space-y-6">
      <ReservationsTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
        statuses={statuses}
      />
    </div>
  )
}
