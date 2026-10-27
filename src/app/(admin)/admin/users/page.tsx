import { or, orderByField } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { isRoot, ROLES } from "@/lib/roles"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getPlatformSettings } from "@/platform/settings/store"
import { UsersTable, type UserRow } from "@/components/admin/users-table"

/** Admin → Users: every account, searchable, filterable, one page at a time. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) redirect("/dashboard")
  const t = await getTranslations("admin.users")
  const settings = await getPlatformSettings()

  const spec: TableQuerySpec = {
    sortable: ["createdAt", "email", "name"],
    defaultDir: "desc",
    filters: { role: ROLES },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const { User } = db8.orm.public
  const searched = query.q ? User.where((u) => or(u.email.ilike(`%${query.q}%`), u.name.ilike(`%${query.q}%`))) : User
  const matching = query.filters.role ? searched.where({ role: query.filters.role as UserRow["role"] }) : searched

  const [count, users] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "name", "email", "image", "role", "createdAt")
      .include("subscription", (s) => s.select("status").include("plan", (p) => p.select("name")))
      .orderBy(orderByField(User, query.sort, query.dir, ["createdAt", "email", "name"]))
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
  ])

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    createdAt: toDate(u.createdAt).toISOString(),
    plan: u.subscription?.plan?.name ?? null,
    status: u.subscription?.status ?? null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <UsersTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        viewer={{ id: viewer.id, role: viewer.role }}
      />
    </div>
  )
}
