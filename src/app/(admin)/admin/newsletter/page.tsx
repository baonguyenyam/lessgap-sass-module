import { and, orderByField } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { isRoot } from "@/lib/roles"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getPlatformSettings } from "@/platform/settings/store"
import { NewsletterTable, NEWSLETTER_STATUSES, type SubscriberRow } from "@/components/admin/newsletter-table"

/** Admin → Newsletter: every address, with its consent dates. */
export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) redirect("/dashboard")
  const t = await getTranslations("admin.newsletter")
  const settings = await getPlatformSettings()

  const spec: TableQuerySpec = {
    sortable: ["createdAt", "email"],
    defaultDir: "desc",
    filters: { status: NEWSLETTER_STATUSES },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const { NewsletterSubscriber } = db8.orm.public
  const platformList = NewsletterSubscriber.where((s) => s.tenantId.isNull())
  const searched = query.q ? platformList.where((s) => s.email.ilike(`%${query.q}%`)) : platformList
  const status = query.filters.status
  const matching =
    status === "pending"
      ? searched.where((s) => and(s.confirmedAt.isNull(), s.unsubscribedAt.isNull()))
      : status === "confirmed"
        ? searched.where((s) => and(s.confirmedAt.isNotNull(), s.unsubscribedAt.isNull()))
        : status === "unsubscribed"
          ? searched.where((s) => s.unsubscribedAt.isNotNull())
          : searched

  const [count, subscribers] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "email", "source", "createdAt", "confirmedAt", "unsubscribedAt")
      .orderBy(orderByField(NewsletterSubscriber, query.sort, query.dir, ["createdAt", "email"]))
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
  ])

  const rows: SubscriberRow[] = subscribers.map((s) => ({
    id: s.id,
    email: s.email,
    source: s.source,
    createdAt: toDate(s.createdAt).toISOString(),
    status: s.unsubscribedAt ? "unsubscribed" : s.confirmedAt ? "confirmed" : "pending",
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <NewsletterTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
      />
    </div>
  )
}
