import { and } from "@prisma/orm-postgres/orm-client"
import { getTranslations, getFormatter } from "next-intl/server"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { unreadMemberNotifications } from "@/platform/notify/member"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { Bell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { NotificationList } from "@/components/dashboard/notification-list"

export const instant = false

/** The member's notification feed (phase 17.1): unread first, then the
 * recent read rows — one page, mark-one or mark-all read. */
export default async function NotificationsFeedPage() {
  const ctx = await requireTenantContext()
  const [t, format] = await Promise.all([getTranslations("dashboard.notifications"), getFormatter()])
  const unread = await unreadMemberNotifications(ctx.tenantId, ctx.user.id)
  const read = await db8.orm.public.MemberNotification.where((n) =>
    and(n.tenantId.eq(ctx.tenantId), n.readAt.isNotNull())
  )
    .orderBy((n) => n.createdAt.desc())
    .all()
  const rows = [
    ...unread.map((r) => ({ ...r, unread: true })),
    ...read.slice(0, 50).map((r) => ({ ...r, unread: false })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <NotificationList.MarkAll tenantId={ctx.tenantId} disabled={unread.length === 0} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Bell} title={t("empty.title")} description={t("empty.description")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id} className={`flex items-start gap-3 px-4 py-3 ${row.unread ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{row.title}</p>
                    {row.body && <p className="text-sm text-muted-foreground">{row.body}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format.dateTime(toDate(row.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  {row.unread && <NotificationList.MarkRead id={row.id} tenantId={ctx.tenantId} />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
