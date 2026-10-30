import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefundButton } from "@/components/payments/refund-button"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Payments (task 6.8): money in (payments) and out (refunds) —
 * the payouts view. */
export default async function PaymentsPage() {
  const c = await requireTenantContext("billing", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "payments"
  )
  const t = await getTranslations("dashboard.payments")
  const [payments, refunds] = await Promise.all([
    db8.orm.public.Payment.where({ tenantId: c.tenantId })
      .orderBy((x) => x.createdAt.desc())
      .all(),
    db8.orm.public.Refund.where({ tenantId: c.tenantId })
      .orderBy((x) => x.createdAt.desc())
      .all(),
  ])
  const refundByPayment = new Map<string, number>()
  for (const r of refunds) refundByPayment.set(r.paymentId, (refundByPayment.get(r.paymentId) ?? 0) + r.amountCents)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("money_in", { count: payments.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {p.kind} · {(p.amountCents / 100).toFixed(2)} {p.currency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {toDate(p.createdAt).toUTCString()} · {p.status}
                    {p.feeCents > 0 && ` · ${t("fee")} ${(p.feeCents / 100).toFixed(2)}`}
                    {(refundByPayment.get(p.id) ?? 0) > 0 &&
                      ` · ${t("refunded")} ${((refundByPayment.get(p.id) ?? 0) / 100).toFixed(2)}`}
                  </p>
                </div>
                {p.status === "succeeded" && <RefundButton paymentId={p.id} />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
