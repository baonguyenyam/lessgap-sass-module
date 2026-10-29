import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReviewActions } from "@/components/booking/review-actions"

/** Dashboard → Reviews (task 11.4): `pending` `Review` rows wait for an
 * approve/reject; the waitlist's coming days sit alongside so the tenant
 * knows who's waiting when a slot frees. */
export default async function ReviewsPage() {
  const c = await requireTenantContext("bookings", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.reviews")
  const [reviews, waiting] = await Promise.all([
    db8.orm.public.Review.where({ tenantId: c.tenantId })
      .include("customer")
      .orderBy((r) => r.createdAt.desc())
      .all(),
    db8.orm.public.WaitlistEntry.where({ tenantId: c.tenantId })
      .orderBy((w) => w.wantedDate.asc())
      .all(),
  ])
  const pending = reviews.filter((r) => r.status === "pending")
  const rest = reviews.filter((r) => r.status !== "pending")
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("pending")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">{t("none_pending")}</p>}
          {pending.map((r) => (
            <div key={r.id} className="space-y-1 border-b pb-4 last:border-0">
              <p className="text-sm font-medium">
                {"★".repeat(r.rating)} · {(r.customer as { name?: string } | null)?.name ?? "—"}
              </p>
              {r.body && <p className="text-sm text-muted-foreground">"{r.body}"</p>}
              <ReviewActions id={r.id} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("waitlist")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {waiting.length === 0 && <p className="text-sm text-muted-foreground">{t("none_waiting")}</p>}
          {waiting.map((w) => (
            <p key={w.id} className="text-sm">
              {w.wantedDate} · {w.email ?? w.phone ?? "—"} · {t(`waitlist_${w.status}`)}
            </p>
          ))}
        </CardContent>
      </Card>
      {rest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("history")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rest.map((r) => (
              <p key={r.id} className="text-sm">
                {"★".repeat(r.rating)} · {(r.customer as { name?: string } | null)?.name ?? "—"} · {t(r.status)}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
