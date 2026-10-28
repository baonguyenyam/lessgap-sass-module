import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { SiteSettingsForm } from "@/components/settings/site-form"

/** Settings → Site (task 3.3): the tenant's public-site content — company
 * profile, opening hours, appearance — saved through `saveSiteSettings`. */
export default async function SiteSettingsPage() {
  const ctx = await requireTenantContext("settings", "manage")
  const t = await getTranslations("dashboard.settings.site")
  const settings = await db8.orm.public.SiteSettings.where({ tenantId: ctx.tenantId }).first()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SiteSettingsForm
        initial={{
          profile: (settings?.profile as never) ?? undefined,
          hours: (settings?.hours as never) ?? undefined,
          appearance: (settings?.appearance as never) ?? undefined,
        }}
      />
    </div>
  )
}
