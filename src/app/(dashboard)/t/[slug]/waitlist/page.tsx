import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WaitlistActions } from "@/components/booking/waitlist-actions"
import { EmptyState } from "@/components/layout/empty-state"
import { Hourglass } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Waitlist (task 16.5): the waitlist's own page — the day's
 * waiters sorted by `wantedDate`, each with the moderation actions a member
 * runs when the customer books or won't come. */
export default async function WaitlistPage() {
  const c = await requireTenantContext("bookings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.waitlist")
  const entries = await db8.orm.public.WaitlistEntry.where({ tenantId: c.tenantId }).all()
  const sorted = [...entries].sort((a, b) => a.wantedDate.localeCompare(b.wantedDate))
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {sorted.length === 0 ? (
        <EmptyState icon={Hourglass} title={t("none")} description={t("none_hint")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("list")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sorted.map((x) => (
              <div key={x.id} className="flex items-center justify-between rounded-md border p-2">
                <p className="text-sm">
                  {x.email ?? x.phone ?? "—"} · {x.wantedDate} · {t(`status.${x.status}`)}
                </p>
                <WaitlistActions entryId={x.id} status={x.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
