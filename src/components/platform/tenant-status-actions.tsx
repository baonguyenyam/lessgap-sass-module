"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, PlayCircle, StopCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { startImpersonation } from "@/app/actions/impersonation"
import { setTenantStatus } from "@/app/actions/platform-tenants"
import type { TenantStatus } from "@/lib/tenant-status"
import { useDrawer } from "@/stores/drawer"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

const SUSPEND = "tenant-suspend"
const REACTIVATE = "tenant-reactivate"
const IMPERSONATE = "tenant-impersonate"

/** Suspend (with a written reason) and reactivate, from the tenant detail page (task 1.10). */
export function TenantStatusActions({ tenant }: { tenant: { id: string; name: string; status: TenantStatus } }) {
  const t = useTranslations("platform.tenants")
  const openDrawer = useDrawer((s) => s.open)

  return (
    <div className="flex gap-2">
      {tenant.status === "SUSPENDED" ? (
        <Button onClick={() => openDrawer(REACTIVATE, tenant.id)}>
          <PlayCircle className="h-4 w-4" />
          {t("reactivate.action")}
        </Button>
      ) : (
        <Button variant="destructive" onClick={() => openDrawer(SUSPEND, tenant.id)}>
          <StopCircle className="h-4 w-4" />
          {t("suspend.action")}
        </Button>
      )}
      {tenant.status !== "CANCELED" && tenant.status !== "SUSPENDED" && (
        <Button variant="outline" onClick={() => openDrawer(IMPERSONATE, tenant.id)}>
          <Eye className="h-4 w-4" />
          {t("impersonate.action")}
        </Button>
      )}
      <StatusDrawer kind={SUSPEND} tenant={tenant} />
      <StatusDrawer kind={REACTIVATE} tenant={tenant} />
      <ImpersonateDrawer tenant={tenant} />
    </div>
  )
}

function ImpersonateDrawer({ tenant }: { tenant: { id: string; name: string } }) {
  const t = useTranslations("platform.tenants")
  const te = useTranslations("platform.tenants.errors")
  const open = useDrawer((s) => s.kind === IMPERSONATE)
  const schema = z.object({ reason: z.string().trim().min(1, te("reasonRequired")).max(500) })
  const form = useForm<{ reason: string }>({ resolver: zodResolver(schema), defaultValues: { reason: "" } })
  if (!open) return null

  return (
    <FormDrawer
      kind={IMPERSONATE}
      title={t("impersonate.title")}
      description={t("impersonate.description", { name: tenant.name })}
      form={form}
      onSubmit={({ reason }) => startImpersonation({ tenantId: tenant.id, reason })}
    >
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("impersonate.reason")}</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder={t("impersonate.reasonPlaceholder")} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}

function StatusDrawer({ kind, tenant }: { kind: string; tenant: { id: string; name: string; status: TenantStatus } }) {
  const t = useTranslations("platform.tenants")
  const te = useTranslations("platform.tenants.errors")
  const open = useDrawer((s) => s.kind === kind)
  const suspending = kind === SUSPEND
  const schema = z.object({ reason: suspending ? z.string().trim().min(1, te("reasonRequired")).max(500) : z.string() })
  const form = useForm<{ reason: string }>({ resolver: zodResolver(schema), defaultValues: { reason: "" } })
  if (!open) return null

  const section = suspending ? "suspend" : "reactivate"
  return (
    <FormDrawer
      kind={kind}
      title={t(`${section}.title`)}
      description={t(`${section}.description`, { name: tenant.name })}
      form={form}
      onSubmit={({ reason }) => setTenantStatus(tenant.id, suspending ? "SUSPENDED" : "ACTIVE", reason)}
    >
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(`${section}.reason`)}</FormLabel>
            <FormControl>
              <Textarea {...field} placeholder={suspending ? t("suspend.reasonPlaceholder") : undefined} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}
