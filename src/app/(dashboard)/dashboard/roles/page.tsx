import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { db8 } from "@/lib/db8"
import { permissionKeys } from "@/lib/schemas/tenant"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { ROLE_PERMISSIONS, TENANT_PERMISSIONS } from "@/platform/tenancy/permissions"
import { RolesTable, type RoleRow } from "@/components/dashboard/roles-table"

/**
 * Dashboard → Roles: the tenant's permission groups ("nhóm quyền"). Built-in
 * roles come from ROLE_PERMISSIONS and cannot be changed; custom roles are
 * OrganizationRole rows managed through Better Auth's dynamicAccessControl
 * (spec/adr/0019). A workspace has a handful, so the list is paged in memory.
 */
export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  let ctx
  try {
    ctx = await requireTenantContext("roles", "view")
  } catch {
    redirect("/dashboard")
  }
  const t = await getTranslations("dashboard.roles")
  const settings = await getViewerSettings()
  const { Member, OrganizationRole } = db8.orm.public

  const spec: TableQuerySpec = {
    sortable: ["role", "members"],
    defaultDir: "asc",
    filters: { kind: ["builtIn", "custom"] },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const [custom, members] = await Promise.all([
    OrganizationRole.select("role", "permission").where({ organizationId: ctx.tenantId }).all(),
    Member.select("role").where({ organizationId: ctx.tenantId }).all(),
  ])
  const counts = new Map<string, number>()
  for (const m of members) counts.set(m.role, (counts.get(m.role) ?? 0) + 1)

  const all: RoleRow[] = [
    ...Object.entries(ROLE_PERMISSIONS).map(([role, grants]) => ({
      id: role,
      role,
      builtIn: true,
      permissions: permissionKeys(grants),
      members: counts.get(role) ?? 0,
    })),
    ...custom.map((r) => ({
      id: r.role,
      role: r.role,
      builtIn: false,
      permissions: permissionKeys(r.permission as Record<string, string[]>),
      members: counts.get(r.role) ?? 0,
    })),
  ]
  const kind = query.filters.kind
  const filtered = all
    .filter((r) => !query.q || r.role.includes(query.q.toLowerCase()))
    .filter((r) => !kind || (kind === "builtIn") === r.builtIn)
    .sort((a, b) => {
      const by = query.sort === "members" ? a.members - b.members : a.role.localeCompare(b.role)
      return query.dir === "asc" ? by : -by
    })
  const rows = filtered.slice(offsetOf(query), offsetOf(query) + query.pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <RolesTable
        rows={rows}
        total={filtered.length}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        catalog={Object.fromEntries(
          Object.entries(TENANT_PERMISSIONS).map(([resource, verbs]) => [resource, [...verbs]])
        )}
        canManage={ctx.member.role === "owner"}
      />
    </div>
  )
}
