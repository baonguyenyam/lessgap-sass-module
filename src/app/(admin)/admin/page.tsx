import { ArrowRight } from "lucide-react"
import { and } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { isRoot } from "@/lib/roles"
import { toDate } from "@/lib/timestamps"
import { mrrHistory, monthlyEquivalent } from "@/lib/metrics"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueChart } from "@/components/admin/revenue-chart"

/**
 * Admin → Overview: the numbers. The lists live on their own pages
 * (Users, Newsletter), each a DataTable.
 */
export default async function AdminPage() {
  const t = await getTranslations("admin")
  const user = await getCurrentUser()
  if (!user || !isRoot(user.role)) redirect("/dashboard")

  const { NewsletterSubscriber, Subscription, User } = db8.orm.public
  const count = (n: { n: number }) => n.n
  const [totalUsers, allSubscriptions, waitlistConfirmed, waitlistPending] = await Promise.all([
    User.aggregate((a) => ({ n: a.count() })).then(count),
    // Every subscription, not just the active ones: the chart needs the rows
    // that have since churned to show the revenue they produced while they
    // were running. The active-only figures are derived from the same result.
    Subscription.include("plan").all(),
    NewsletterSubscriber.where((n) => and(n.confirmedAt.isNotNull(), n.unsubscribedAt.isNull()))
      .aggregate((a) => ({ n: a.count() }))
      .then(count),
    NewsletterSubscriber.where((n) => and(n.confirmedAt.isNull(), n.unsubscribedAt.isNull()))
      .aggregate((a) => ({ n: a.count() }))
      .then(count),
  ])

  const active = allSubscriptions.filter((sub) => sub.status === "ACTIVE")
  const mrr = active.reduce((sum, sub) => sum + monthlyEquivalent(sub.plan), 0)
  const revenue = mrrHistory(
    allSubscriptions.map((sub) => ({ ...sub, createdAt: toDate(sub.createdAt), updatedAt: toDate(sub.updatedAt) }))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("totalUsers")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("activeSubscriptions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("mrr")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">${(mrr / 100).toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("revenueTitle")}</CardTitle>
          <CardDescription>{t("revenueSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenue} label={t("revenueTooltip")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("waitlistTitle")}</CardTitle>
            <CardDescription>
              {t("waitlistSummary", { confirmed: waitlistConfirmed, pending: waitlistPending })}
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/newsletter">
              {t("waitlistOpen")}
              <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}
