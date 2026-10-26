import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { ROLE_PERMISSIONS, TENANT_PERMISSIONS } from "@/platform/tenancy/permissions"
import { createTenantRole, deleteTenantRole } from "@/app/actions/roles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Settings → Roles: the tenant's permission groups ("nhóm quyền"). Built-in
 * roles come from ROLE_PERMISSIONS and cannot be edited; custom roles are
 * OrganizationRole rows managed through Better Auth's dynamicAccessControl
 * (spec/adr/0019).
 */
export default async function RolesPage() {
  let ctx
  try {
    ctx = await requireTenantContext("roles", "view")
  } catch {
    redirect("/dashboard")
  }
  const t = await getTranslations("dashboard.roles")
  const customRoles = await db8.orm.public.OrganizationRole.where({ organizationId: ctx.tenantId })
    .orderBy((r) => r.role.asc())
    .all()
  const memberCounts = new Map<string, number>()
  for (const r of customRoles) {
    memberCounts.set(
      r.role,
      await db8.orm.public.Member.where({ organizationId: ctx.tenantId, role: r.role })
        .aggregate((a) => ({ n: a.count() }))
        .then((x) => x.n),
    )
  }
  const canManage = ctx.member.role === "owner"

  const describe = (permission: Record<string, readonly string[]>) =>
    Object.entries(permission)
      .flatMap(([resource, verbs]) => verbs.map((verb) => `${resource}.${verb}`))
      .join(", ")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("builtin.title")}</CardTitle>
          <CardDescription>{t("builtin.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colRole")}</TableHead>
                <TableHead>{t("colPermissions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ROLE_PERMISSIONS).map(([role, grants]) => (
                <TableRow key={role}>
                  <TableCell><Badge variant="default">{role}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{describe(grants)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("custom.title")}</CardTitle>
          <CardDescription>{t("custom.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customRoles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("custom.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colRole")}</TableHead>
                  <TableHead>{t("colPermissions")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customRoles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.role}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {describe(r.permission as Record<string, string[]>)} ({memberCounts.get(r.role) ?? 0} {t("custom.members")})
                    </TableCell>
                    <TableCell>
                      {canManage && (memberCounts.get(r.role) ?? 0) === 0 && (
                        <form action={deleteTenantRole} className="flex justify-end">
                          <input type="hidden" name="role" value={r.role} />
                          <Button type="submit" size="sm" variant="destructive">{t("custom.delete")}</Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {canManage && (
            <form action={createTenantRole} className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm font-medium">{t("create.title")}</p>
              <Input name="role" required placeholder={t("create.namePlaceholder")} className="h-9 sm:w-64" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(TENANT_PERMISSIONS).map(([resource, verbs]) => (
                  <fieldset key={resource} className="rounded-lg border border-border p-3">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{resource}</legend>
                    {verbs.map((verb) => (
                      <label key={verb} className="flex items-center gap-2 py-0.5 text-sm">
                        <input type="checkbox" name="perm" value={`${resource}.${verb}`} className="h-4 w-4" />
                        {verb}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <Button type="submit" size="sm">{t("create.submit")}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
