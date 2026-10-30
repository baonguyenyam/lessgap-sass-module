import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { templates, templateKeys, templateLocales } from "@/emails/templates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmailTemplateEditor } from "@/components/settings/email-template-editor"

export const instant = false

/** Settings → Emails (the in-system management rule): every template the
 * system sends, per locale — the tenant edits its copy; the kit's default
 * stays the fallback (notify.template.<key>.<locale> in TenantSetting). */
export default async function EmailSettingsPage() {
  const m = await requireTenantContext("settings", "manage")
  const t = await getTranslations("dashboard.settings.emails")
  const overrides = await db8.orm.public.TenantSetting.where({ tenantId: m.tenantId }).all()
  const overrideBy = new Map(overrides.filter((x) => x.key.startsWith("notify.template.")).map((x) => [x.key, x.value]))
  const sample = {
    name: "Ana",
    service: "Manicure",
    staff: "Mia",
    time: "2027-03-08 15:00 UTC",
    manageUrl: "https://example.test",
    business: "Fixture Co",
  }
  const rows = templateKeys.flatMap((key) =>
    templateLocales(key).map((locale) => {
      const override = overrideBy.get(`notify.template.${key}.${locale}`) as
        { subject?: string; html?: string } | undefined
      const def = templates[key][locale](sample)
      return { key, locale, override, fallbackSubject: def.subject, fallbackHtml: def.html }
    })
  )
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      {rows.map((row) => (
        <Card key={`${row.key}-${row.locale}`}>
          <CardHeader>
            <CardTitle className="text-base">
              {row.key} · {row.locale}
              {row.override && <span className="ml-2 text-xs text-muted-foreground">({t("customized")})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmailTemplateEditor
              templateKey={row.key}
              locale={row.locale}
              subject={row.override?.subject ?? row.fallbackSubject}
              html={row.override?.html ?? row.fallbackHtml}
              customized={!!row.override}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
