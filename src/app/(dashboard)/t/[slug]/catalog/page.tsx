import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CatalogActions } from "@/components/catalog/catalog-actions"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Catalog (task 4.2): the tenant's categories and services —
 * what the site's services section renders. */
export default async function CatalogPage() {
  const c = await requireTenantContext("catalog", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "catalog"
  )
  const t = await getTranslations("dashboard.catalog")
  const [categories, services] = await Promise.all([
    db8.orm.public.ServiceCategory.where({ tenantId: c.tenantId }).all(),
    db8.orm.public.Service.where({ tenantId: c.tenantId }).include("variants").include("category").all(),
  ])
  const formatPrice = (cents: number, currency: string) => `${(cents / 100).toFixed(0)} ${currency.toUpperCase()}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CatalogActions addService categories={categories.map((x) => ({ id: x.id, name: x.name }))} />
      {categories.map((cat) => (
        <Card key={cat.id}>
          <CardHeader>
            <CardTitle>{cat.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services
              .filter((s) => s.categoryId === cat.id)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {s.name}
                      {s.isSample ? ` ${"· sample"}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {s.durationMinutes} min · {formatPrice(s.priceCents, s.currency)}
                    </p>
                  </div>
                  <CatalogActions remove serviceId={s.id} />
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
      {services
        .filter((s) => !s.categoryId)
        .map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between pt-4">
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">
                {s.durationMinutes} min · {formatPrice(s.priceCents, s.currency)}
              </p>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
