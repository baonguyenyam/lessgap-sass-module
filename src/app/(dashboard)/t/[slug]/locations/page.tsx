import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LocationForm } from "@/components/booking/location-form"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Locations (task 16.2): a tenant's physical branches —
 * name + address each, the `locationId` a staff/appointment carries. */
export default async function LocationsPage() {
  const c = await requireTenantContext("bookings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.locations")
  const locations = await db8.orm.public.Location.where({ tenantId: c.tenantId }).all()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("add")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("list")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {locations.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
          {locations.map((x) => (
            <p key={x.id} className="text-sm">
              {x.name}
              {x.address ? ` · ${x.address}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
