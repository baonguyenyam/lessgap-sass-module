import { getTranslations } from "next-intl/server"
import { requirePlatformRole } from "@/platform/staff"
import { templates, templateKeys, templateLocales } from "@/emails/templates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TemplatePreview } from "@/components/platform/template-preview"

/** Platform → Email templates (task 5.6, spec/07): every template, every
 * locale — a staff page that renders each and can send-test it. Templates
 * stay code; a tenant's override lives in `TenantSetting`. */
export default async function TemplatesPage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.emails.templates")
  const sample = {
    name: "Ana",
    service: "Manicure",
    staff: "Mia",
    time: "2027-03-08 15:00 UTC",
    manageUrl: "https://example.test",
    business: "Fixture Co",
  }
  const previews = templateKeys.flatMap((key) =>
    templateLocales(key).map((locale) => ({ key, locale, rendered: templates[key][locale](sample) }))
  )
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {previews.map((x) => (
        <Card key={`${x.key}.${x.locale}`}>
          <CardHeader>
            <CardTitle>
              {x.key} · {x.locale}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{x.rendered.subject}</p>
            <div
              className="rounded-md border bg-muted/30 p-3 text-sm"
              dangerouslySetInnerHTML={{ __html: x.rendered.html }}
            />
            <TemplatePreview templateKey={x.key} locale={x.locale} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
