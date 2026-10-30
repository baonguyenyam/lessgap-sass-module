import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { WaitlistTable, type WaitlistRow } from "@/components/waitlist/waitlist-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("bookings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.waitlist")
  const settings = await getViewerSettings()
  const entries = await db8.orm.public.WaitlistEntry.where({ tenantId: c.tenantId }).all()
  const statuses = [...new Set(entries.map((x) => x.status))]
  const spec: TableQuerySpec = {
    sortable: ["wantedDate"],
    defaultDir: "asc",
    filters: { status: statuses },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  let rows: WaitlistRow[] = entries.map((x) => ({
    id: x.id,
    wantedDate: x.wantedDate,
    contact: x.email ?? x.phone ?? "",
    status: x.status,
  }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.contact.toLowerCase().includes(q) || r.wantedDate.includes(q))
  }
  if (query.filters.status) rows = rows.filter((r) => r.status === query.filters.status)
  rows.sort((a, b) => (query.dir === "desc" ? -1 : 1) * a.wantedDate.localeCompare(b.wantedDate))
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  return (
    <div className="space-y-6">
      <WaitlistTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
        statuses={statuses}
      />
    </div>
  )
}
