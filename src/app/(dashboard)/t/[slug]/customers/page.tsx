import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomerActions } from "@/components/customers/customer-actions"
import { EmptyState } from "@/components/layout/empty-state"
import { Users } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Customers (task 5.5): the tenant's customer list — every
 * booker deduplicated by email then phone, with their consent badges. */
export default async function CustomersPage() {
  const c = await requireTenantContext("customers", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "customers"
  )
  const t = await getTranslations("dashboard.customers")
  const customers = await db8.orm.public.Customer.where({ tenantId: c.tenantId })
    .orderBy((x) => x.createdAt.desc())
    .all()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {customers.length === 0 ? (
        <EmptyState icon={Users} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("list", { count: customers.length })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customers.map((x) => (
              <div key={x.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{x.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[x.email, x.phone].filter(Boolean).join(" · ") || t("no_contact")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[x.marketingConsentAt && t("consent_marketing"), x.smsConsentAt && t("consent_sms")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <CustomerActions customerId={x.id} name={x.name} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
