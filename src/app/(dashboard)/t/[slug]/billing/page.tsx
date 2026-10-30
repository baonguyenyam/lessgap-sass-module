import Link from "next/link"
import { redirect } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { describeDiscount, getEntitlement, trialDaysFor, type DiscountSummary } from "@/lib/billing"
import { getEntitlements } from "@/platform/entitlements"
import { periodStartFor } from "@/platform/entitlements/usage"
import { includedInPlan, usageRows } from "@/lib/plan-usage"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { Check, Receipt, X } from "lucide-react"
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
function daysUntil(date: Date) {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
}

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
  // The tenant's plan, invoices and add-ons: `billing.manage` only (the owner
  // by default), like every other page that checks its permission.
  let ctx
  try {
    ctx = await requireTenantContext("billing", "manage")
  } catch {
    redirect("/dashboard")
  }
  const { tenantId, user: currentUser } = ctx
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

  // Plan usage (task 17.4): every capped limit against what the tenant has
  // used — live-row counts for counted limits, `UsageCounter` for metered
  // ones, month-to-date rows for the monthly caps enforcement counts inline.
  const entitlements = await getEntitlements({ tenantId })
  const periodStart = periodStartFor("month")
  const [
    members,
    services,
    staff,
    products,
    roles,
    sources,
    counters,
    monthlyQuotes,
    monthlyAppointments,
    chatbotSettings,
  ] = await Promise.all([
    db8.orm.public.Member.where({ organizationId: tenantId }).aggregate((m) => ({ n: m.count() })),
    db8.orm.public.Service.where({ tenantId }).aggregate((s) => ({ n: s.count() })),
    db8.orm.public.StaffMember.where({ tenantId }).aggregate((s) => ({ n: s.count() })),
    db8.orm.public.Product.where({ tenantId }).aggregate((p) => ({ n: p.count() })),
    db8.orm.public.OrganizationRole.where({ organizationId: tenantId }).aggregate((r) => ({ n: r.count() })),
    db8.orm.public.KnowledgeSource.where({ tenantId }).aggregate((s) => ({ n: s.count() })),
    db8.orm.public.UsageCounter.where({ tenantId, periodStart }).all(),
    db8.orm.public.QuoteRequest.where({ tenantId })
      .where((q) => q.createdAt.gte(periodStart))
      .aggregate((q) => ({ n: q.count() })),
    db8.orm.public.Appointment.where({ tenantId })
      .where((a) => a.createdAt.gte(periodStart))
      .aggregate((a) => ({ n: a.count() })),
    db8.orm.public.TenantSetting.where({ tenantId, key: "chatbot.settings" }).first(),
  ])
  const counterUsed = (key: string) => counters.find((c) => c.limitKey === key)?.used ?? 0
  const chatbotLanguages =
    typeof chatbotSettings?.value === "object" && chatbotSettings.value !== null
      ? (chatbotSettings.value as { languages?: unknown }).languages
      : undefined
  const usage = usageRows([
    { key: "members.max", used: members.n, limit: entitlements.limit("members.max") },
    { key: "catalog.services.max", used: services.n, limit: entitlements.limit("catalog.services.max") },
    { key: "booking.staff.max", used: staff.n, limit: entitlements.limit("booking.staff.max") },
    { key: "booking.monthly", used: monthlyAppointments.n, limit: entitlements.limit("booking.monthly") },
    { key: "shop.products.max", used: products.n, limit: entitlements.limit("shop.products.max") },
    { key: "roles.max", used: roles.n, limit: entitlements.limit("roles.max") },
    { key: "quotes.monthly", used: monthlyQuotes.n, limit: entitlements.limit("quotes.monthly") },
    { key: "chatbot.documents.max", used: sources.n, limit: entitlements.limit("chatbot.documents.max") },
    {
      key: "chatbot.languages.max",
      used: Array.isArray(chatbotLanguages) ? chatbotLanguages.length : 0,
      limit: entitlements.limit("chatbot.languages.max"),
    },
    {
      key: "chatbot.messages.monthly",
      used: counterUsed("chatbot.messages.monthly"),
      limit: entitlements.limit("chatbot.messages.monthly"),
    },
    {
      key: "newsletter.exports.monthly",
      used: counterUsed("newsletter.exports.monthly"),
      limit: entitlements.limit("newsletter.exports.monthly"),
    },
  ])
  const inclusions = includedInPlan(entitlements)
  // Feature keys carry dots, which the message files can't — `members.max`
  // is looked up as `featureLabels.members_max`; en.json covers every key
  // and `plan-usage.test.ts` keeps it that way.
  const featureLabel = (key: string) => t(`featureLabels.${key.replaceAll(".", "_")}`)
  const daysLeft = subscription?.currentPeriodEnd ? daysUntil(toDate(subscription.currentPeriodEnd)) : null

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
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
          <CardDescription>
            {purchase
              ? t("purchasedOn", { date: purchaseDate ?? "" })
              : trialEndDate
                ? t("trialEndsOn", { date: trialEndDate })
                : subscription
                  ? `${t("renewsOn", { date: renewalDate ?? "" })}${daysLeft !== null ? ` · ${t("daysLeft", { count: daysLeft })}` : ""}`
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
              <Link href="/pricing" className="text-sm font-medium underline-offset-4 hover:underline">
                {t("viewPlans")}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {usage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("planUsage")}</CardTitle>
            <CardDescription>{t("planUsageHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {usage.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4 py-2">
                  <span>{featureLabel(row.key)}</span>
                  <span className="text-muted-foreground">{t("usedOf", { used: row.used, limit: row.limit })}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("includedInPlan")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {inclusions.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2">
                <span className="truncate">{featureLabel(row.key)}</span>
                {row.kind === "boolean" ? (
                  row.included ? (
                    <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" strokeWidth={3} />
                  ) : (
                    <X className="size-4 shrink-0 text-muted-foreground" />
                  )
                ) : row.limit === null ? (
                  <span className="text-muted-foreground">{t("unlimited")}</span>
                ) : row.limit === 0 ? (
                  <X className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <span className="text-muted-foreground">{row.limit}</span>
                )}
              </li>
            ))}
          </ul>
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

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("noInvoicesTitle")}
          description={process.env.STRIPE_SECRET_KEY ? t("noInvoices") : t("noInvoicesStripe")}
        />
      ) : (
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
      )}
    </div>
  )
}
