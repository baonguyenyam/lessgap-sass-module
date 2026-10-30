import {
  BarChart3,
  Bell,
  Boxes,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  List,
  Mail,
  MessageCircle,
  Package,
  Users,
  Utensils,
  UserSquare,
  type LucideIcon,
} from "lucide-react"
import { getFormatter, getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { describeModuleData, pendingPurge } from "@/platform/modules/lifecycle"
import { moduleRegistry } from "@/modules/registry"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/data-table/status-badge"
import { ModuleActions } from "@/components/modules/module-actions"

const ICONS: Record<string, LucideIcon> = {
  analytics: BarChart3,
  booking: Calendar,
  catalog: List,
  chatbot: MessageCircle,
  customers: Users,
  newsletter: Mail,
  notifications: Bell,
  ordering: ClipboardList,
  payments: CreditCard,
  quotes: FileText,
  reservations: Utensils,
  shop: Package,
  team: UserSquare,
}

/**
 * Settings → Modules (task 2.10, spec/15): every registered module on one
 * surface, one row each — what it is, whether it is on, what it needs — with
 * a switch to turn it on or off and a "…" menu for its data (export, delete,
 * cancel a scheduled delete).
 */
export default async function ModulesSettingsPage() {
  const ctx = await requireTenantContext("settings", "manage")
  const [t, format] = await Promise.all([getTranslations("dashboard.settings.modules"), getFormatter()])
  const actor = { kind: "member" as const, userId: ctx.user.id, role: ctx.member.role }

  const rows = await Promise.all(
    Object.entries(moduleRegistry).map(async ([key, m]) => {
      const state = await db8.orm.public.TenantModule.where({ tenantId: ctx.tenantId, moduleKey: key }).first()
      const purge = await pendingPurge(ctx.tenantId, key)
      const enabled = !!state?.enabled
      const counts = enabled ? {} : await describeModuleData({ tenantId: ctx.tenantId, actor }, key)
      const kept = Object.values(counts).reduce((sum, n) => sum + n, 0)
      const dependsOn = ("dependsOn" in m ? (m.dependsOn as readonly string[]) : []).map(
        (dep) => moduleRegistry[dep as keyof typeof moduleRegistry]?.name ?? dep
      )
      return { key, name: m.name, stage: m.stage, enabled, purge, kept, dependsOn }
    })
  )
  const enabledCount = rows.filter((row) => row.enabled).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("subtitle")} {t("summary", { enabled: enabledCount, total: rows.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((row) => {
            const Icon = ICONS[row.key] ?? Boxes
            return (
              <li key={row.key} className="flex items-center gap-4 px-6 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    {row.purge ? (
                      <StatusBadge tone="danger">{t("status.purgeScheduled")}</StatusBadge>
                    ) : row.enabled ? (
                      <StatusBadge tone="success">{t("status.enabled")}</StatusBadge>
                    ) : (
                      <StatusBadge tone="muted">{t("status.disabled")}</StatusBadge>
                    )}
                    {row.stage !== "stable" && <Badge variant="outline">{t(`stage.${row.stage}`)}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{t(`descriptions.${row.key}`)}</p>
                  {(row.dependsOn.length > 0 || row.purge || (!row.enabled && row.kept > 0)) && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        row.dependsOn.length > 0 && t("requires", { modules: row.dependsOn.join(", ") }),
                        row.purge &&
                          t("purgeOn", {
                            date: format.dateTime(toDate(row.purge.runAfter), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }),
                          }),
                        !row.purge && !row.enabled && row.kept > 0 && t("dataKept", { count: row.kept }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <ModuleActions
                  moduleKey={row.key}
                  moduleName={row.name}
                  enabled={row.enabled}
                  purgeScheduled={!!row.purge}
                />
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
