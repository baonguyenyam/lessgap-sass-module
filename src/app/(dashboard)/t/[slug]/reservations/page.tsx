import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { Utensils } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Reservations (task 5.8): the tenant's table bookings. */
export default async function ReservationsPage() {
  const c = await requireTenantContext("bookings", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "reservations"
  )
  const t = await getTranslations("dashboard.reservations")
  const reservations = await db8.orm.public.Reservation.where({ tenantId: c.tenantId })
    .include("table")
    .orderBy((x) => x.startTs.asc())
    .all()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {reservations.length === 0 ? (
        <EmptyState icon={Utensils} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("list", { count: reservations.length })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {r.name} · {t("party", { size: r.partySize })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {toDate(r.startTs).toUTCString()} · {r.table?.name ?? "—"} · {r.status}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
