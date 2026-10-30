import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { memberCan } from "@/platform/tenancy/permissions"
import { StaffTable, type StaffRow } from "@/components/team/staff-table"
import { parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"

export const instant = false

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const c = await requireTenantContext("team", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "team"
  )
  const t = await getTranslations("dashboard.team")
  const settings = await getViewerSettings()
  const spec: TableQuerySpec = {
    sortable: ["name"],
    defaultDir: "asc",
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const staff = await db8.orm.public.StaffMember.where({ tenantId: c.tenantId }).all()
  let rows: StaffRow[] = staff.map((s) => ({ id: s.id, name: s.name, bio: s.bio, isSample: s.isSample }))
  if (query.q) {
    const q = query.q.toLowerCase()
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.bio ?? "").toLowerCase().includes(q))
  }
  rows.sort((a, b) => (query.dir === "desc" ? -1 : 1) * a.name.localeCompare(b.name))
  const total = rows.length
  rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  const canManage = await memberCan(c.tenantId, c.member.role, "team", "manage")

  return (
    <div className="space-y-6">
      <StaffTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={total}
        query={query}
        canManage={canManage}
      />
    </div>
  )
}
