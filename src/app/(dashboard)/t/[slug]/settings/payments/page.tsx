import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConnectButton } from "@/components/payments/connect-button"

/** Settings → Payments (task 6.3): Connect onboarding status + link, and
 * the paid-features gate explained while `chargesEnabled` is false. */
export default async function PaymentsSettingsPage() {
  const c = await requireTenantContext("settings", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "payments"
  )
  const t = await getTranslations("dashboard.settings.payments")
  const tenant = await db8.orm.public.Tenant.where({ id: c.tenantId }).first()
  const connected = tenant?.chargesEnabled === true
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{connected ? t("connected") : t("not_connected")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{connected ? t("connected_hint") : t("gate_hint")}</p>
          {!connected && <ConnectButton />}
          {tenant?.stripeAccountId && (
            <p className="text-xs text-muted-foreground">
              {t("account")}: {tenant.stripeAccountId} · {tenant.connectOnboardingStatus} · {t("payouts")}:{" "}
              {tenant.payoutsEnabled ? t("yes") : t("no")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
