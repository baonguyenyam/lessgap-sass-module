import { or, orderByField } from "@prisma/orm-postgres/orm-client"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { db8 } from "@/lib/db8"
import { offsetOf, parseTableQuery, type TableQuerySpec } from "@/lib/table-query"
import { mayGrantRole } from "@/lib/invitations"
import { toDate } from "@/lib/timestamps"
import { getViewerSettings } from "@/platform/settings/tenant-store"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { memberCan } from "@/platform/tenancy/permissions"
import { tenantRoleKeys } from "@/platform/tenancy/invitations"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MembersTable, type MemberRow } from "@/components/dashboard/members-table"
import { RevokeInvitation } from "@/components/dashboard/revoke-invitation"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * Dashboard → Members: the tenant's sub-users ("user con") and pending
 * invitations. `members.view` to see them; owners and managers manage them.
 * Role choices are the built-in roles plus the tenant's custom groups
 * (spec/adr/0019).
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  let ctx
  try {
    ctx = await requireTenantContext("members", "view")
  } catch {
    redirect("/dashboard")
  }
  const t = await getTranslations("dashboard.members")
  const settings = await getViewerSettings()
  const { Invitation, Member, Session, User } = db8.orm.public

  const roleOptions = await tenantRoleKeys(ctx.tenantId)

  const spec: TableQuerySpec = {
    sortable: ["createdAt", "role"],
    defaultDir: "asc",
    filters: { role: roleOptions },
    defaultPageSize: settings["display.page_size"],
  }
  const query = parseTableQuery(await searchParams, spec)

  const inTenant = Member.where({ organizationId: ctx.tenantId })
  // Name and address live on the user: find the matching users first.
  const userIds = query.q
    ? (
        await User.select("id")
          .where((u) => or(u.email.ilike(`%${query.q}%`), u.name.ilike(`%${query.q}%`)))
          .all()
      ).map((u) => u.id)
    : null
  const searched = userIds ? inTenant.where((m) => m.userId.in(userIds.length ? userIds : [""])) : inTenant
  const matching = query.filters.role ? searched.where({ role: query.filters.role }) : searched

  const [count, members, invitations] = await Promise.all([
    matching.aggregate((a) => ({ n: a.count() })),
    matching
      .include("user", (u) => u.select("name", "email"))
      .orderBy(orderByField(Member, query.sort, query.dir, ["createdAt", "role"]))
      .offset(offsetOf(query))
      .limit(query.pageSize)
      .all(),
    Invitation.where({ organizationId: ctx.tenantId, status: "pending" })
      .orderBy((i) => i.createdAt.desc())
      .all(),
  ])

  // Latest session activity per member; sessions end on sign-out, so this is best effort.
  const sessions = members.length
    ? await Session.select("userId", "updatedAt")
        .where((s) => s.userId.in(members.map((m) => m.userId)))
        .all()
    : []
  const lastActive = new Map<string, number>()
  for (const s of sessions) {
    const at = toDate(s.updatedAt).getTime()
    if (at > (lastActive.get(s.userId) ?? 0)) lastActive.set(s.userId, at)
  }

  const rows: MemberRow[] = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user?.name ?? "",
    email: m.user?.email ?? "",
    role: m.role,
    status: m.status === "suspended" ? "suspended" : "active",
    createdAt: toDate(m.createdAt).toISOString(),
    lastActiveAt: lastActive.has(m.userId) ? new Date(lastActive.get(m.userId)!).toISOString() : null,
  }))
  const [canManage, canInvite] = await Promise.all([
    memberCan(ctx.tenantId, ctx.member.role, "members", "manage"),
    memberCan(ctx.tenantId, ctx.member.role, "members", "invite"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle", { tenant: ctx.tenant.name })}</p>
      </div>
      <MembersTable
        rows={rows}
        total={count.n}
        query={query}
        defaults={{ sort: spec.sortable[0], dir: spec.defaultDir, pageSize: spec.defaultPageSize }}
        roleOptions={roleOptions}
        grantableRoles={roleOptions.filter((role) => mayGrantRole(ctx.member.role, role))}
        canManage={canManage}
        canInvite={canManage || canInvite}
        viewerUserId={ctx.user.id}
      />
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("invitations.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 truncate">{i.email}</span>
                  <Badge variant="secondary">{i.role}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{t(`invitations.status.${i.status}`)}</span>
                  {(canManage || canInvite) && <RevokeInvitation id={i.id} email={i.email} />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
