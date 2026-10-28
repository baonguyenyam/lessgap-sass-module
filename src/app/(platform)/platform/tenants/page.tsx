import { or, orderByField } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getPlatformSettings } from "@/platform/settings/store"
import { requirePlatformRole } from "@/platform/staff"
import { TenantsTable, type TenantRow } from "@/components/platform/tenants-table"
import { TENANT_STATUSES } from "@/lib/tenant-status"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Platform → Tenants: every workspace, searchable by name or slug, filterable by status (task 1.10). */
export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformRole()
  const t = await getTranslations("platform.tenants")
  const settings = await getPlatformSettings()

  const spec: TableQuerySpec = {
    sortable: ["createdAt", "name", "slug"],
    defaultDir: "desc",
    filters: { status: TENANT_STATUSES },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const { Member, Tenant } = db8.orm.public
  const searched = query.q
    ? Tenant.where((x) => or(x.name.ilike(`%${query.q}%`), x.slug.ilike(`%${query.q}%`)))
    : Tenant
  const matching = query.filters.status
    ? searched.where({ status: query.filters.status as TenantRow["status"] })
    : searched

  const [count, tenants] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "name", "slug", "status", "createdAt")
      .orderBy(orderByField(Tenant, query.sort, query.dir, ["createdAt", "name", "slug"]))
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
  ])

  const ids = tenants.map((x) => x.id)
  const members = ids.length
    ? await Member.select("organizationId")
        .where((m) => m.organizationId.in(ids))
        .all()
    : []
  const memberCounts = new Map<string, number>()
  for (const m of members) memberCounts.set(m.organizationId, (memberCounts.get(m.organizationId) ?? 0) + 1)

  const rows: TenantRow[] = tenants.map((x) => ({
    id: x.id,
    name: x.name,
    slug: x.slug,
    status: x.status,
    members: memberCounts.get(x.id) ?? 0,
    createdAt: toDate(x.createdAt).toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TenantsTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
      />
    </div>
  )
}
