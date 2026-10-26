import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { TENANT_ROLE_KEYS } from "@/platform/tenancy/permissions"
import { inviteMember, changeMemberRole, removeMember } from "@/app/actions/members"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Settings → Members: the tenant's sub-users ("user con") and pending
 * invitations. Owners manage them here; the `members.view` permission gate is
 * in requireTenantContext. Role choices = built-in roles + the tenant's
 * custom groups (spec/adr/0019).
 */
export default async function MembersPage() {
  let ctx
  try {
    ctx = await requireTenantContext("members", "view")
  } catch {
    redirect("/dashboard")
  }
  const t = await getTranslations("dashboard.members")
  const { Member, OrganizationRole, Invitation } = db8.orm.public

  const [members, invitations, customRoles] = await Promise.all([
    Member.include("user").where({ organizationId: ctx.tenantId }).orderBy((m) => m.createdAt.asc()).all(),
    Invitation.where({ organizationId: ctx.tenantId, status: "pending" }).orderBy((i) => i.createdAt.desc()).all(),
    OrganizationRole.where({ organizationId: ctx.tenantId }).orderBy((r) => r.role.asc()).all(),
  ])
  const roleOptions = [...TENANT_ROLE_KEYS, ...customRoles.map((r) => r.role)]
  const canManage = ctx.member.role === "owner" || ctx.member.role === "manager"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle", { tenant: ctx.tenant.name })}</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t("invite.title")}</CardTitle>
            <CardDescription>{t("invite.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteMember} className="flex flex-col gap-2 sm:flex-row">
              <Input name="email" type="email" required placeholder={t("invite.emailPlaceholder")} className="h-9 sm:w-72" />
              <select name="role" className="h-9 rounded-[var(--radius)] border border-border bg-background px-3 text-sm" defaultValue="staff">
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <Button type="submit" size="sm">{t("invite.submit")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.count", { count: members.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("list.colMember")}</TableHead>
                <TableHead>{t("list.colRole")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{m.user?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.role === "owner" ? "default" : "outline"}>{m.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {canManage && m.userId !== ctx.user.id && (
                      <div className="flex justify-end gap-2">
                        <form action={changeMemberRole} className="flex gap-2">
                          <input type="hidden" name="memberId" value={m.id} />
                          <select name="role" defaultValue={m.role} className="h-9 rounded-[var(--radius)] border border-border bg-background px-2 text-sm">
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" variant="secondary">{t("list.update")}</Button>
                        </form>
                        <form action={removeMember}>
                          <input type="hidden" name="memberId" value={m.id} />
                          <Button type="submit" size="sm" variant="destructive">{t("list.remove")}</Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("invitations.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {invitations.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <span>{i.email}</span>
                  <Badge variant="secondary">{i.role}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{i.status}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
