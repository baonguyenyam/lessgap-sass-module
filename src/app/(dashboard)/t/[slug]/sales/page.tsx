import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SalesActions } from "@/components/booking/sales-actions"
import { EmptyState } from "@/components/layout/empty-state"
import { Gift, Wallet } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Sales (task 12.5): the till sells a `GiftCard`, a `Package`
 * onto a customer, activates a `Membership` — and the holdings list
 * alongside so staff sees what's outstanding. */
export default async function SalesPage() {
  const c = await requireTenantContext("bookings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.sales")
  const [cards, pkgs, memberships, customers, pkgHolds, memHolds] = await Promise.all([
    db8.orm.public.GiftCard.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Package.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Membership.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Customer.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.CustomerPackage.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.CustomerMembership.where({ tenantId: c.tenantId }).all(),
  ])
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("sell")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesActions packages={pkgs} memberships={memberships} customers={customers} />
        </CardContent>
      </Card>
      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">{t("cards")}</TabsTrigger>
          <TabsTrigger value="holdings">{t("holdings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-4">
          {cards.length === 0 ? (
            <EmptyState icon={Gift} title={t("no_cards")} description={t("no_cards_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-1 pt-6">
                {cards.map((x) => (
                  <p key={x.id} className="text-sm">
                    {x.code} · {(x.balanceCents / 100).toFixed(2)} · {x.active ? t("active") : t("inactive")}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="holdings" className="mt-4">
          {pkgHolds.length === 0 && memHolds.length === 0 ? (
            <EmptyState icon={Wallet} title={t("no_holdings")} description={t("no_holdings_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-1 pt-6">
                {pkgHolds.map((x) => (
                  <p key={x.id} className="text-sm">
                    {t("pkg")} #{x.id.slice(0, 6)} · {x.sessionsLeft} {t("sessions_left")} ·{" "}
                    {x.active ? t("active") : t("inactive")}
                  </p>
                ))}
                {memHolds.map((x) => (
                  <p key={x.id} className="text-sm">
                    {t("mem")} #{x.id.slice(0, 6)} · {x.active ? t("active") : t("inactive")}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
