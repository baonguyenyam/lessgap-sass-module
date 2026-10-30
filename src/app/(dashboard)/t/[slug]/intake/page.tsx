import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntakeAddButton, IntakeFormDrawer } from "@/components/booking/intake-drawer"
import { EmptyState } from "@/components/layout/empty-state"
import { ClipboardList, Inbox } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Intake (task 16.3): the contact-only forms a tenant asks
 * before a visit, plus the responses that landed on appointments. */
export default async function IntakePage() {
  const c = await requireTenantContext("bookings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.intake")
  const forms = await db8.orm.public.IntakeForm.where({ tenantId: c.tenantId }).all()
  const responses = await db8.orm.public.IntakeResponse.where({ tenantId: c.tenantId }).all()
  const byForm = new Map(forms.map((x) => [x.id, x]))
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} actions={<IntakeAddButton />} />
      <Tabs defaultValue="forms">
        <TabsList>
          <TabsTrigger value="forms">{t("forms")}</TabsTrigger>
          <TabsTrigger value="responses">{t("responses")}</TabsTrigger>
        </TabsList>
        <TabsContent value="forms" className="mt-4">
          {forms.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("none")} description={t("none_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-2 pt-6">
                {forms.map((x) => (
                  <p key={x.id} className="text-sm">
                    {x.name} · {(x.fields as { label: string }[]).map((f) => f.label).join(", ")}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="responses" className="mt-4">
          {responses.length === 0 ? (
            <EmptyState icon={Inbox} title={t("no_responses")} description={t("no_responses_hint")} />
          ) : (
            <Card>
              <CardContent className="space-y-2 pt-6">
                {responses.map((x) => (
                  <div key={x.id} className="rounded-md border p-2 text-sm">
                    <p className="font-medium">{byForm.get(x.formId)?.name ?? x.formId}</p>
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {JSON.stringify(x.answers, null, 2)}
                    </pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <IntakeFormDrawer />
    </div>
  )
}
