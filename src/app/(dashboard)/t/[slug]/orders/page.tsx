import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Orders (task 6.4): the tenant's shop orders. */
export default async function OrdersPage() {
  const c = await requireTenantContext("orders", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "shop"
  )
  const t = await getTranslations("dashboard.orders")
  const orders = await db8.orm.public.Order.where({ tenantId: c.tenantId })
    .include("lines")
    .orderBy((x) => x.createdAt.desc())
    .all()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("list", { count: orders.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {toDate(o.createdAt).toUTCString()} · {o.lines.map((l) => `${l.name} ×${l.quantity}`).join(", ")} ·{" "}
                    {(o.totalCents / 100).toFixed(2)} · {o.fulfilment} · {o.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
