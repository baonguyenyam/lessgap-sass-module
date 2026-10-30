import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { memberCan } from "@/platform/tenancy/permissions"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmailTemplateEditor } from "@/components/settings/email-template-editor"
import { EmailDesignPicker } from "@/components/settings/email-design-picker"
import { templates, templateKeys, templateLocales } from "@/emails/templates"
import { EMAIL_DESIGNS, type EmailDesign } from "@/emails/layout"

export const instant = false

/** Emails (the in-system management rule, now its own section): the send
 * design + every template × locale — the tenant edits its copy and picks a
 * layout; the kit's defaults stay the fallback. */
export default async function EmailsPage() {
  const ctx = await requireTenantContext()
  const t = await getTranslations("dashboard.emails")
  const overrides = await db8.orm.public.TenantSetting.where({ tenantId: ctx.tenantId }).all()
  const overrideBy = new Map(overrides.filter((x) => x.key.startsWith("notify.template.")).map((x) => [x.key, x.value]))
  const design = (overrides.find((x) => x.key === "notify.design")?.value as EmailDesign) ?? "plain"
  const sample = {
    name: "Ana",
    service: "Manicure",
    time: "10:00 Saturday",
    manageUrl: "#",
    business: ctx.tenant.name,
    totalCents: "$120",
    acceptUrl: "#",
  }
  const rows = templateKeys.flatMap((key) =>
    templateLocales(key).map((locale) => {
      const override = overrideBy.get(`notify.template.${key}.${locale}`) as
        { subject?: string; html?: string } | undefined
      const def = templates[key][locale](sample)
      return { key, locale, override, fallbackSubject: def.subject, fallbackHtml: def.html }
    })
  )
  const canManage = await memberCan(ctx.tenantId, ctx.member.role, "settings", "manage")

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("design.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailDesignPicker current={design} designs={EMAIL_DESIGNS} canManage={canManage} />
        </CardContent>
      </Card>
      {rows.map((row) => (
        <Card key={`${row.key}-${row.locale}`}>
          <CardHeader>
            <CardTitle className="text-base">
              {t(`templates.${row.key}`)} · {row.locale}
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
