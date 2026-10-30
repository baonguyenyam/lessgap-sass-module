import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requirePlatformRole } from "@/platform/staff"
import { PlansTable, type PlanRow } from "@/components/platform/plans-table"

// Cache Components adoption (spec/adr/0022): this page always reads fresh request data.
export const instant = false

export default async function PlatformPlansPage() {
  await requirePlatformRole()
  const t = await getTranslations("platform.plans")

  const [plans, subscriptions] = await Promise.all([
    db8.orm.public.Plan.orderBy((p) => p.createdAt.asc()).all(),
    // Subscriber counts per plan — the drawer shows how many tenants a save
    // will change before it happens.
    db8.orm.public.Subscription.select("planId").all(),
  ])
  const countByPlan = new Map<string, number>()
  for (const s of subscriptions) countByPlan.set(s.planId, (countByPlan.get(s.planId) ?? 0) + 1)

  const rows: PlanRow[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    interval: p.interval,
    visibility: p.visibility,
    setupFeeCents: p.setupFeeCents,
    features: p.features as Record<string, unknown>,
    subscribers: countByPlan.get(p.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <PlansTable rows={rows} />
    </div>
  )
}
import { PageHeader } from "@/components/layout/page-header"
