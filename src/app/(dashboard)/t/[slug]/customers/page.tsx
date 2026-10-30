import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { CustomersTable, type CustomerRow } from "@/components/customers/customers-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("customers", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "customers"
  )
  const t = await getTranslations("dashboard.customers")
  const settings = await getViewerSettings()
  const spec: TableQuerySpec = { sortable: ["name"], defaultDir: "asc", defaultPageSize: settings["display.page_size"] }
  const query = parseTableQuery(await searchParams, spec)

  const customers = await db8.orm.public.Customer.where({ tenantId: c.tenantId }).all()
  let rows: CustomerRow[] = customers.map((x) => ({
    id: x.id,
    name: x.name,
    contact: [x.email, x.phone].filter(Boolean).join(" · "),
    marketing: Boolean(x.marketingConsentAt),
    sms: Boolean(x.smsConsentAt),
  }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.contact.toLowerCase().includes(q))
  }
  rows.sort((a, b) => (query.dir === "desc" ? -1 : 1) * a.name.localeCompare(b.name))
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  return (
    <div className="space-y-6">
      <CustomersTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
      />
    </div>
  )
}
