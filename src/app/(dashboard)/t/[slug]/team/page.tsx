import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/layout/page-header"
import { db8 } from "@/lib/db8"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent } from "@/components/ui/card"
import { TeamActions } from "@/components/team/team-actions"
import { EmptyState } from "@/components/layout/empty-state"
import { UserSquare } from "lucide-react"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/** Dashboard → Team (task 4.3): the tenant's staff — the people the site
 * shows; not logins, not members. */
export default async function TeamPage() {
  const c = await requireTenantContext("team", "manage")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "team"
  )
  const t = await getTranslations("dashboard.team")
  const staff = await db8.orm.public.StaffMember.where({ tenantId: c.tenantId }).all()

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} actions={<TeamActions add />} />
      {staff.length === 0 ? (
        <EmptyState icon={UserSquare} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {staff.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between pt-4">
                <div>
                  <p className="font-medium">
                    {s.name}
                    {s.isSample ? ` ${"· sample"}` : ""}
                  </p>
                  {s.bio && <p className="text-sm text-muted-foreground">{s.bio}</p>}
                </div>
                <TeamActions remove staffId={s.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
