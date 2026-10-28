import { ArrowRight } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { getFormatter, getTranslations } from "next-intl/server"
import Link from "next/link"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { getEntitlement } from "@/lib/billing"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GetStartedChecklist } from "@/components/dashboard/get-started-checklist"
import { CheckoutStatusToast } from "@/components/billing/checkout-status-toast"
import { SubscriptionStatusBadge } from "@/components/billing/subscription-status-badge"
import { isKitSite } from "@/config/kit"
import { tenantPath } from "@/lib/tenant-paths"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = await getTranslations("dashboard.home")
  const format = await getFormatter()
  const user = await requireUser()

  const entitlement = await getEntitlement(user.id)
  const subscription = entitlement.kind === "subscription" ? entitlement.subscription : null
  const lifetime = entitlement.kind === "lifetime" ? entitlement.purchase : null

  const [projectCount, userRow] = await Promise.all([
    db8.orm.public.Project.where({ userId: user.id })
      .aggregate((a) => ({ n: a.count() }))
      .then((r) => r.n),
    db8.orm.public.User.select("name", "onboardingDismissedAt", "stripeCustomerId").where({ id: user.id }).first(),
  ])

  // Formatted through next-intl rather than a hardcoded "en-US": a date is
  // part of the interface, and a locale that reads dates day-first would show
  // the wrong one otherwise.
  const renewalDate = subscription?.currentPeriodEnd
    ? format.dateTime(toDate(subscription.currentPeriodEnd), {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="space-y-6">
      <CheckoutStatusToast />
      <div>
        <h1 className="text-2xl font-bold">
          {t("greeting", { name: user.name?.split(" ")[0] ?? t("greetingFallback") })}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!userRow?.onboardingDismissedAt && (
        <GetStartedChecklist
          slug={slug}
          hasName={Boolean(userRow?.name)}
          hasProject={projectCount > 0}
          hasBilling={entitlement.kind !== "free" || Boolean(userRow?.stripeCustomerId)}
        />
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">{t("projectsTitle")}</CardTitle>
              <CardDescription>{t("projectsCount", { count: projectCount })}</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={tenantPath(slug, "projects")}>
                {projectCount === 0 ? t("projectsCreate") : t("projectsViewAll")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("currentPlan")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lifetime?.plan.name ?? subscription?.plan.name ?? t("planFree")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("status")}</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <SubscriptionStatusBadge status={subscription.status} />
            ) : (
              <Badge variant={lifetime ? "success" : "secondary"}>
                {lifetime ? t("statusLifetime") : t("statusFree")}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("nextBilling")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lifetime ? t("none") : (renewalDate ?? t("none"))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upsell for users without a plan. On the kit's own site it teases the
          Pro tier; in your app it points at your paid plans. Delete it if you
          would rather not sell from inside the dashboard. */}
      {entitlement.kind === "free" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">{t("upsellTitle")}</CardTitle>
            <CardDescription>{t("upsellBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={isKitSite ? "/pricing" : tenantPath(slug, "billing")}>
                {t("upsellCta")}
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
