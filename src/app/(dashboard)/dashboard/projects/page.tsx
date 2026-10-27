import { or, orderByField } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { requireUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getViewerSettings } from "@/platform/settings/tenant-store"
import { ProjectsTable, type ProjectRow } from "@/components/dashboard/projects-table"

/** Dashboard → Projects: the caller's projects, searched and paged on the server. */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTranslations("dashboard.projects")
  const user = await requireUser()
  const settings = await getViewerSettings()

  const spec: TableQuerySpec = {
    sortable: ["updatedAt", "name", "createdAt"],
    defaultDir: "desc",
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const { Project } = db8.orm.public
  const mine = Project.where({ userId: user.id })
  const matching = query.q
    ? mine.where((p) => or(p.name.ilike(`%${query.q}%`), p.description.ilike(`%${query.q}%`)))
    : mine

  const [count, projects] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "name", "description", "createdAt", "updatedAt")
      .orderBy(orderByField(Project, query.sort, query.dir, ["updatedAt", "name", "createdAt"]))
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
  ])

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: toDate(p.createdAt).toISOString(),
    updatedAt: toDate(p.updatedAt).toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ProjectsTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
      />
    </div>
  )
}
