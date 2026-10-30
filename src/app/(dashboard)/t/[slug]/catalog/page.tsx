import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { memberCan } from "@/platform/tenancy/permissions"
import { ServicesTable, type ServiceRow } from "@/components/catalog/services-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Catalog (task 4.2): the tenant's categories and services —
 * what the site's services section renders. */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("catalog", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "catalog"
  )
  const t = await getTranslations("dashboard.catalog")
  const settings = await getViewerSettings()
  const [categories, services] = await Promise.all([
    db8.orm.public.ServiceCategory.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Service.where({ tenantId: c.tenantId }).include("category").all(),
  ])
  const categoryName = new Map(categories.map((x) => [x.id, x.name]))
  const spec: TableQuerySpec = {
    sortable: ["name", "priceCents", "durationMinutes"],
    defaultDir: "asc",
    filters: { category: categories.map((x) => x.name) },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  let rows: ServiceRow[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.categoryId ? (categoryName.get(s.categoryId) ?? null) : null,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
    currency: s.currency,
    isSample: s.isSample,
  }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.name.toLowerCase().includes(q))
  }
  const facet = query.filters.category
  if (facet) rows = rows.filter((r) => r.category === facet)
  rows.sort((a, b) => {
    const dir = query.dir === "desc" ? -1 : 1
    if (query.sort === "priceCents") return dir * (a.priceCents - b.priceCents)
    if (query.sort === "durationMinutes") return dir * (a.durationMinutes - b.durationMinutes)
    return dir * a.name.localeCompare(b.name)
  })
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  const canManage = await memberCan(c.tenantId, c.member.role, "catalog", "manage")

  return (
    <div className="space-y-6">
      <ServicesTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
        categories={categories.map((x) => ({ id: x.id, name: x.name }))}
        canManage={canManage}
      />
    </div>
  )
}
