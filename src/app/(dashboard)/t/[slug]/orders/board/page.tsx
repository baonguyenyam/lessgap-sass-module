import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BoardColumn } from "@/components/ordering/board-column"

/** Dashboard → Order board (task 6.5): received → preparing → ready →
 * done, in four columns the kitchen advances. */
export default async function OrderBoardPage() {
  const c = await requireTenantContext("orders", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "ordering"
  )
  const t = await getTranslations("dashboard.ordering")
  const orders = await db8.orm.public.Order.where({ tenantId: c.tenantId, fulfilment: "pickup" })
    .include("lines")
    .orderBy((x) => x.createdAt.asc())
    .all()
  const columns = ["received", "preparing", "ready", "done"]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("board_title")}</h1>
        <p className="text-muted-foreground">{t("board_subtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {columns.map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-sm">{t(`status.${status}`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <BoardColumn
                orders={orders
                  .filter((o) => o.status === status)
                  .map((o) => ({
                    id: o.id,
                    customerName: o.customerName,
                    lines: o.lines.map((l) => `${l.name} ×${l.quantity}`),
                    pickupSlot: o.pickupSlot,
                    createdAt: toDate(o.createdAt).toUTCString(),
                  }))}
                nextStatus={status === "done" ? null : columns[columns.indexOf(status) + 1]!}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
