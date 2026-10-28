import { requireUser } from "@/lib/auth"
import { getFormatter, getTranslations } from "next-intl/server"
import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { describeDiscount, getEntitlement, trialDaysFor, type DiscountSummary } from "@/lib/billing"
import { ensureTenant } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InvoicesTable, INVOICE_STATUSES, type InvoiceRow } from "@/components/billing/invoices-table"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { getViewerSettings } from "@/platform/settings/tenant-store"
import { ManageBillingButton } from "@/components/billing/manage-billing-button"
import { SubscriptionStatusBadge } from "@/components/billing/subscription-status-badge"
import { AddOnCards } from "@/components/billing/addon-cards"
import { PlanCards, type PlanCardData } from "@/components/billing/plan-cards"
import { exampleEnterpriseCard } from "@/components/billing/enterprise-card"
import { CheckoutStatusToast } from "@/components/billing/checkout-status-toast"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

// Invoice statuses come from Stripe as stable codes, like subscription ones;
// their labels live in the message files under `dashboard.billing.invoiceStatus`.

async function getInvoices(customerId: string | null) {
  if (!customerId || !process.env.STRIPE_SECRET_KEY) return []
  try {
    const { stripe } = await import("@/lib/stripe")
    // The latest hundred, paged in the table; older ones are in the Customer Portal.
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 100 })
    return invoices.data
  } catch {
    return []
  }
}

// Read live from Stripe, like the invoices. A discount is Stripe's to end (a
// repeating coupon runs out, or you remove it from the dashboard), and a copy
// in the database would go stale without a webhook of its own. Skipped in demo
// mode, whose subscriptions exist only in the seed.
async function getDiscounts(stripeSubscriptionId: string | null): Promise<DiscountSummary[]> {
  if (!stripeSubscriptionId || !process.env.STRIPE_SECRET_KEY || process.env.DEMO_MODE === "true") return []
  try {
    const { stripe } = await import("@/lib/stripe")
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["discounts.source.coupon", "discounts.promotion_code"],
    })
    return subscription.discounts.flatMap((discount) => describeDiscount(discount) ?? [])
  } catch {
    return []
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTranslations("dashboard.billing")
  const format = await getFormatter()
  const currentUser = await requireUser()

  const { tenantId } = await ensureTenant(currentUser)
  const [user, subscriptionRow] = await Promise.all([
    db8.orm.public.User.select("stripeCustomerId").where({ id: currentUser.id }).first(),
    db8.orm.public.Subscription.select("id").where({ tenantId }).first(),
  ])

  const entitlement = await getEntitlement(tenantId)
  const [allAddOns, ownedAddOns] = await Promise.all([
    db8.orm.public.AddOn.where({ isActive: true })
      .orderBy((a) => a.createdAt.asc())
      .all(),
    db8.orm.public.TenantAddOn.where({ tenantId }).all(),
  ])
  const purchase = entitlement.kind === "lifetime" ? entitlement.purchase : null
  const subscription =
    entitlement.kind === "subscription"
      ? entitlement.subscription
      : entitlement.kind === "lifetime"
        ? entitlement.subscription
        : null
  const [invoices, discounts] = await Promise.all([
    getInvoices(user?.stripeCustomerId ?? null),
    getDiscounts(!purchase && subscription ? subscription.stripeSubscriptionId : null),
  ])

  // Metered plans are excluded from the grid: they exist for the usage-based
  // example and would be confusing as a self-serve card.
  // In demo mode the one-time plan is excluded too: the grid mirrors the
  // Starter / Pro / Enterprise triad of the demo landing.
  const isDemo = process.env.DEMO_MODE === "true"
  const selfServe = db8.orm.public.Plan.where((p) => and(p.isActive.eq(true), p.meterEventName.isNull()))
  const planRows =
    entitlement.kind === "free"
      ? await (isDemo ? selfServe.where((p) => p.interval.neq("ONE_TIME")) : selfServe)
          .orderBy((p) => p.price.asc())
          .all()
      : []
  // Same rule as the checkout route, so a card only shows the trial a checkout
  // from it would really carry: a free user whose subscription was cancelled
  // still has the row, and gets no second trial.
  const hasHadSubscription = Boolean(subscriptionRow)
  const plans: PlanCardData[] = planRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.price,
    interval: p.interval,
    stripePriceId: p.stripePriceId,
    features: [...p.marketingFeatures],
    trialDays: trialDaysFor(p, hasHadSubscription),
  }))
  const checkoutDisabled = isDemo || !process.env.STRIPE_SECRET_KEY
  const disabledNote = isDemo ? t("checkoutDisabledDemo") : t("checkoutDisabledStripe")

  const longDate = (date: Date) => format.dateTime(date, { year: "numeric", month: "long", day: "numeric" })
  const invoiceSpec: TableQuerySpec = {
    sortable: ["created"],
    defaultDir: "desc",
    filters: { status: INVOICE_STATUSES },
    defaultPageSize: (await getViewerSettings())["display.page_size"],
  }
  const invoiceQuery = parseTableQuery(await searchParams, invoiceSpec)
  const matchingInvoices = invoices
    .filter((invoice) => !invoiceQuery.filters.status || invoice.status === invoiceQuery.filters.status)
    .sort((a, b) => (invoiceQuery.dir === "asc" ? 1 : -1) * ((a.created ?? 0) - (b.created ?? 0)))
  const invoiceRows: InvoiceRow[] = matchingInvoices
    .slice(offsetOf(invoiceQuery), offsetOf(invoiceQuery) + invoiceQuery.pageSize)
    .map((invoice) => ({
      id: invoice.id ?? String(invoice.created),
      created: new Date((invoice.created ?? 0) * 1000).toISOString(),
      total: invoice.total ?? 0,
      currency: invoice.currency,
      status: invoice.status,
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    }))
  const money = (amount: number, currency: string | null) =>
    format.number(amount / 100, { style: "currency", currency: (currency ?? "usd").toUpperCase() })
  const renewalDate = subscription?.currentPeriodEnd ? longDate(toDate(subscription.currentPeriodEnd)) : null
  // trialEndsAt stays set after a trial is over, so the status decides.
  const trialEndDate =
    subscription?.status === "TRIALING" && subscription.trialEndsAt ? longDate(toDate(subscription.trialEndsAt)) : null
  const purchaseDate = purchase ? longDate(toDate(purchase.createdAt)) : null

  const discountLines = discounts.map((d) => {
    const off =
      d.percentOff != null
        ? t("discountPercent", { percent: d.percentOff })
        : t("discountAmount", { amount: money(d.amountOff ?? 0, d.currency) })
    const duration =
      d.duration === "once"
        ? t("discountOnce")
        : d.endsAt
          ? t("discountUntil", { date: longDate(d.endsAt) })
          : t("discountForever")
    const line = t("discount", { discount: off, duration })
    return d.code ? `${line} · ${t("discountCode", { code: d.code })}` : line
  })

  return (
    <div className="space-y-6">
      <CheckoutStatusToast />
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
          <CardDescription>
            {purchase
              ? t("purchasedOn", { date: purchaseDate ?? "" })
              : trialEndDate
                ? t("trialEndsOn", { date: trialEndDate })
                : subscription
                  ? t("renewsOn", { date: renewalDate ?? "" })
                  : t("onFreePlan")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                {purchase?.plan?.name ?? purchase?.addOn?.name ?? subscription?.plan.name ?? t("free")}
              </p>
              {purchase && <Badge variant="success">{t("lifetimeAccess")}</Badge>}
              {!purchase && subscription && <SubscriptionStatusBadge status={subscription.status} />}
              {!purchase && subscription?.cancelAtPeriodEnd && (
                <p className="text-sm text-muted-foreground">{t("cancelsAtPeriodEnd")}</p>
              )}
              {discountLines.map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {purchase
                  ? `$${(purchase.amount / 100).toFixed(2)}`
                  : subscription
                    ? `$${(subscription.plan.price / 100).toFixed(2)}`
                    : "$0"}
              </p>
              <p className="text-sm text-muted-foreground">
                {purchase
                  ? t("oneTime")
                  : subscription
                    ? `/ ${subscription.plan.interval.toLowerCase()}`
                    : t("perMonth")}
              </p>
            </div>
          </div>
          {purchase && subscription && (
            <p className="text-sm text-muted-foreground">{t("alsoSubscribed", { plan: subscription.plan.name })}</p>
          )}
          {(subscription || (purchase && user?.stripeCustomerId)) && (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <ManageBillingButton className="w-full sm:w-auto" />
              {subscription && !purchase && <p className="text-sm text-muted-foreground">{t("portalHint")}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {allAddOns.length > 0 && (
        <AddOnCards
          addOns={allAddOns.map((a) => ({
            id: a.id,
            name: a.name,
            features: Object.keys(a.features as Record<string, unknown>).join(", "),
            owned: ownedAddOns.some((o) => o.addOnId === a.id),
          }))}
          disabled={checkoutDisabled}
        />
      )}

      {entitlement.kind === "free" && plans.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("availablePlans")}</h2>
            <p className="text-sm text-muted-foreground">{t("availablePlansHint")}</p>
          </div>
          <PlanCards
            plans={plans}
            checkoutDisabled={checkoutDisabled}
            disabledNote={disabledNote}
            contactCard={isDemo ? await exampleEnterpriseCard() : undefined}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("invoiceHistory")}</CardTitle>
          <CardDescription>{t("invoiceHistoryHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicesTable
            rows={invoiceRows}
            total={matchingInvoices.length}
            query={invoiceQuery}
            defaults={{
              sort: invoiceSpec.sortable[0],
              dir: invoiceSpec.defaultDir,
              pageSize: invoiceSpec.defaultPageSize,
            }}
            emptyDescription={process.env.STRIPE_SECRET_KEY ? t("noInvoices") : t("noInvoicesStripe")}
          />
        </CardContent>
      </Card>
    </div>
  )
}
