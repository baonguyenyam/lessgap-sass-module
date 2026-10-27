import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TenantGeneralForm } from "@/components/settings/tenant-general-form"
import { memberCan } from "@/platform/tenancy/permissions"
import { requireTenantContext } from "@/platform/tenancy/require-member"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Settings → General: the tenant's name and the slug in its URLs. */
export default async function GeneralSettingsPage() {
  const ctx = await requireTenantContext()
  const t = await getTranslations("dashboard.settings.tenant")
  const canManage = await memberCan(ctx.tenantId, ctx.member.role, "settings", "manage")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generalTitle")}</CardTitle>
        <CardDescription>{t("generalDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <TenantGeneralForm name={ctx.tenant.name} slug={ctx.tenant.slug} canManage={canManage} />
      </CardContent>
    </Card>
  )
}
