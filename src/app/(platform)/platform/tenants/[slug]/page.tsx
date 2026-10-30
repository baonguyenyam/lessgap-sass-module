import { getFormatter, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requirePlatformRole } from "@/platform/staff"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TenantStatusActions } from "@/components/platform/tenant-status-actions"
import { TenantStatusBadge } from "@/components/platform/tenant-status-badge"
import { TenantOverrides } from "@/components/platform/tenant-overrides"
import { FEATURES } from "@/platform/entitlements/registry"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * Platform → Tenants → one tenant: its identity, status and members, plus the
 * suspend/reactivate tool (task 1.10). Impersonation arrives with task 1.11.
 */
export default async function PlatformTenantPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePlatformRole()
  const { slug } = await params
  const t = await getTranslations("platform.tenants")
  const tOverrides = await getTranslations("platform.overrides")
  const format = await getFormatter()

  const tenant = await db8.orm.public.Tenant.where({ slug }).first()
  if (!tenant) notFound()

  const members = await db8.orm.public.Member.where({ organizationId: tenant.id })
    .include("user", (u) => u.select("name", "email"))
    .orderBy((m) => m.createdAt.asc())
    .all()
  const owner = members.find((m) => m.role === "owner")
  const overrides = await db8.orm.public.EntitlementOverride.where({ tenantId: tenant.id })
    .orderBy((o) => o.createdAt.asc())
    .all()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            <span className="font-mono text-sm">{tenant.slug}</span>
            <TenantStatusBadge status={tenant.status} />
          </p>
        </div>
        <TenantStatusActions tenant={{ id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t("detail.slug")}</dt>
              <dd className="font-mono">{tenant.slug}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detail.created")}</dt>
              <dd>{format.dateTime(toDate(tenant.createdAt), "date")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detail.owner")}</dt>
              <dd>{owner?.user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detail.vertical")}</dt>
              <dd>{tenant.verticalKey}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detail.timeZone")}</dt>
              <dd>{tenant.timeZone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detail.currency")}</dt>
              <dd>{tenant.currency.toUpperCase()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">{t("detail.members")}</TabsTrigger>
          <TabsTrigger value="overrides">{tOverrides("title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ul className="divide-y divide-border text-sm">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 truncate">{m.user?.name || m.user?.email}</span>
                    <span className="min-w-0 truncate text-muted-foreground">{m.user?.email}</span>
                    <Badge variant={m.role === "owner" ? "default" : "outline"} className="ml-auto">
                      {m.role}
                    </Badge>
                    <Badge variant={m.status === "suspended" ? "destructive" : "secondary"}>
                      {t(`detail.memberStatus.${m.status === "suspended" ? "suspended" : "active"}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="overrides" className="mt-4">
          <TenantOverrides tenantId={tenant.id} rows={overrides} featureKeys={Object.keys(FEATURES)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
