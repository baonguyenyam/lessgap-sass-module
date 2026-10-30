import { or } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"
import { getPlatformSettings } from "@/platform/settings/store"
import { requirePlatformRole } from "@/platform/staff"
import { EmailsTable, type EmailRow } from "@/components/platform/emails-table"
import { EMAIL_STATUSES } from "@/lib/job-status"

export const instant = false

/** Platform → Emails: the EmailMessage audit log — every delivery attempt (task 1.13). */
export default async function PlatformEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformRole()
  const t = await getTranslations("platform.emails")
  const settings = await getPlatformSettings()

  const { EmailMessage, Tenant } = db8.orm.public
  const [kindsRows, tenants] = await Promise.all([EmailMessage.select("kind").all(), Tenant.select("id", "slug").all()])
  const kinds = [...new Set(kindsRows.map((m) => m.kind))].sort()

  const spec: TableQuerySpec = {
    sortable: ["createdAt", "toAddress", "kind"],
    defaultDir: "desc",
    filters: { status: EMAIL_STATUSES, kind: kinds, tenant: tenants.map((t) => t.slug) },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const byStatus = query.filters.status
    ? EmailMessage.where({ status: query.filters.status as EmailRow["status"] })
    : EmailMessage
  const byKind = query.filters.kind ? byStatus.where({ kind: query.filters.kind }) : byStatus
  const tenant = query.filters.tenant ? tenants.find((t) => t.slug === query.filters.tenant) : undefined
  const byTenant = tenant ? byKind.where({ tenantId: tenant.id }) : byKind
  const matching = query.q
    ? byTenant.where((m) => or(m.toAddress.ilike(`%${query.q}%`), m.subject.ilike(`%${query.q}%`)))
    : byTenant

  const [count, messages] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .select("id", "kind", "toAddress", "subject", "status", "provider", "tenantId", "createdAt")
      .orderBy((m) =>
        m[query.sort === "toAddress" ? "toAddress" : query.sort === "kind" ? "kind" : "createdAt"][query.dir]()
      )
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
  ])

  const slugOf = new Map(tenants.map((t) => [t.id, t.slug]))
  const rows: EmailRow[] = messages.map((m) => ({
    id: m.id,
    kind: m.kind,
    toAddress: m.toAddress,
    subject: m.subject,
    status: m.status,
    provider: m.provider,
    tenantSlug: m.tenantId ? (slugOf.get(m.tenantId) ?? null) : null,
    createdAt: toDate(m.createdAt).toISOString(),
  }))

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <EmailsTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        kinds={kinds}
        tenants={tenants.map((t) => t.slug)}
      />
    </div>
  )
}
import { PageHeader } from "@/components/layout/page-header"
