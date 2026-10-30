import { getTranslations } from "next-intl/server"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { db8 } from "@/lib/db8"
import { FEATURES } from "@/platform/entitlements/registry"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UpgradeButton } from "@/components/billing/upgrade-button"

export const instant = false

/** Where a feature the plan lacks sends a member (phase 16, requirements):
 * names the feature and lists the plans that include it, with the upgrade
 * CTA — never a bare 403. */
export default async function UpgradeRequiredPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const { feature } = await searchParams
  await requireTenantContext()
  const t = await getTranslations("dashboard.upgrade")
  const featureKey = feature && feature in FEATURES ? feature : null
  const plans = await db8.orm.public.Plan.where({ isActive: true, visibility: "PUBLIC" }).all()
  const granting = plans.filter((p) => featureKey && (p.features as Record<string, unknown>)?.[featureKey])

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      {featureKey && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Badge variant="outline" className="font-mono">
              {featureKey}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">{t("featureNeeded")}</p>
          </CardContent>
        </Card>
      )}
      {granting.length > 0 ? (
        <div className="grid gap-3">
          {granting.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {(plan.price / 100).toFixed(2)} / {plan.interval}
                </span>
                {plan.stripePriceId && <UpgradeButton priceId={plan.stripePriceId} />}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">{t("noPlans")}</CardContent>
        </Card>
      )}
    </div>
  )
}
