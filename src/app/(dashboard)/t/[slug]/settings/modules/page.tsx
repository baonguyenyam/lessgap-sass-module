import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { describeModuleData, pendingPurge } from "@/platform/modules/lifecycle"
import { moduleRegistry } from "@/modules/registry"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ModuleActions } from "@/components/modules/module-actions"

/**
 * Settings → Modules (task 2.10, spec/15): every registered module with its
 * state for this tenant — enabled, disabled (data kept), or purge-scheduled
 * — and the owner actions: enable, disable, export data, delete data, cancel.
 */
export default async function ModulesSettingsPage() {
  const ctx = await requireTenantContext("settings", "manage")
  const t = await getTranslations("dashboard.settings.modules")

  const rows = await Promise.all(
    Object.entries(moduleRegistry).map(async ([key, m]) => {
      const state = await db8.orm.public.TenantModule.where({ tenantId: ctx.tenantId, moduleKey: key }).first()
      const purge = await pendingPurge(ctx.tenantId, key)
      const counts = !state?.enabled
        ? await describeModuleData(
            { tenantId: ctx.tenantId, actor: { kind: "member", userId: ctx.user.id, role: ctx.member.role } },
            key
          )
        : {}
      return { key, name: m.name, stage: m.stage, enabled: !!state?.enabled, purge, counts }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <Card key={row.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">{row.name}</CardTitle>
                <CardDescription>{t(`stage.${row.stage}`)}</CardDescription>
              </div>
              <Badge variant={row.enabled ? "default" : row.purge ? "destructive" : "secondary"}>
                {row.enabled ? t("status.enabled") : row.purge ? t("status.purgeScheduled") : t("status.disabled")}
              </Badge>
            </CardHeader>
            <CardContent>
              {row.purge && <p className="mb-3 text-sm text-muted-foreground">{t("purgeHint")}</p>}
              {!row.enabled && Object.keys(row.counts).length > 0 && (
                <p className="mb-3 font-mono text-xs text-muted-foreground">
                  {Object.entries(row.counts)
                    .map(([k, n]) => `${k}: ${n}`)
                    .join(", ")}
                </p>
              )}
              <ModuleActions
                moduleKey={row.key}
                moduleName={row.name}
                enabled={row.enabled}
                purgeScheduled={!!row.purge}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
