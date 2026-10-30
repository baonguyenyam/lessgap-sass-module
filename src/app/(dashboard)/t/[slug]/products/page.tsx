import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductForm } from "@/components/booking/product-form"
import { EmptyState } from "@/components/layout/empty-state"
import { Ticket } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Products (task 16.4): the sellable catalog — the `Package` and
 * `Membership` rows `buyPackage`/`activateMembership` need something to sell
 * from. */
export default async function ProductsPage() {
  const c = await requireTenantContext("bookings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.products")
  const packages = await db8.orm.public.Package.where({ tenantId: c.tenantId }).all()
  const memberships = await db8.orm.public.Membership.where({ tenantId: c.tenantId }).all()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("add_package")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm kind="package" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("add_membership")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm kind="membership" />
        </CardContent>
      </Card>
      {packages.length === 0 && memberships.length === 0 ? (
        <EmptyState icon={Ticket} title={t("none")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("list")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {packages.map((x) => (
              <p key={x.id} className="text-sm">
                {x.name} · {x.sessions} {t("sessions")} · ${(x.priceCents / 100).toFixed(2)}
              </p>
            ))}
            {memberships.map((x) => (
              <p key={x.id} className="text-sm">
                {x.name} · ${(x.priceCents / 100).toFixed(2)} {t("per_month")}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
