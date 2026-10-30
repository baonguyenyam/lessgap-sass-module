import { orderByField } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { NewsletterTable, NEWSLETTER_STATUSES, type SubscriberRow } from "@/components/admin/newsletter-table"
import { AddSubscriber } from "@/components/dashboard/add-subscriber"
import { unsubscribeTenantSubscribers } from "@/app/actions/newsletter"
import { byStatus, tenantSubscribers } from "@/platform/newsletter/tenant-list"
import { getViewerSettings } from "@/platform/settings/tenant-store"
import { memberCan } from "@/platform/tenancy/permissions"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { requireModuleRoute } from "@/platform/modules/runtime"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** This workspace's own newsletter list. */
export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  let ctx
  try {
    ctx = await requireTenantContext("newsletter", "view")
    // A disabled module's routes 404 the same as a non-member's (L2).
    await requireModuleRoute(
      { tenantId: ctx.tenantId, actor: { kind: "member", userId: ctx.user.id, role: ctx.member.role } },
      "newsletter"
    )
  } catch {
    notFound()
  }
  const t = await getTranslations("dashboard.newsletter")
  const [settings, canManage] = await Promise.all([
    getViewerSettings(),
    memberCan(ctx.tenantId, ctx.member.role, "newsletter", "manage"),
  ])
  const spec: TableQuerySpec = {
    sortable: ["createdAt", "email"],
    defaultDir: "desc",
    filters: { status: NEWSLETTER_STATUSES },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const list = tenantSubscribers(ctx.tenantId)
  const searched = query.q ? list.where((s) => s.email.ilike(`%${query.q}%`)) : list
  const matching = byStatus(searched, query.filters.status)
  const [count, subscribers] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "email", "source", "createdAt", "confirmedAt", "unsubscribedAt")
      .orderBy(orderByField(db8.orm.public.NewsletterSubscriber, query.sort, query.dir, ["createdAt", "email"]))
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
      <NewsletterTable
        heading={{ title: t("title"), description: t("subtitle") }}
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        unsubscribe={unsubscribeTenantSubscribers}
        exportHref="/api/dashboard/newsletter-export"
        canManage={canManage}
        toolbar={canManage ? <AddSubscriber /> : null}
      />
    </div>
  )
}
