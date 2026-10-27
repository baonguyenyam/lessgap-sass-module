"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { saveNotification } from "@/app/actions/user-settings"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import type { NotificationKey } from "@/platform/settings/user"

export function NotificationSwitches({ values }: { values: Record<NotificationKey, boolean> }) {
  const t = useTranslations("dashboard.account.notifications")
  const [pending, startTransition] = useTransition()
  const [savingKey, setSavingKey] = useState<NotificationKey | null>(null)
  const rows: { key: NotificationKey; label: string; hint: string }[] = [
    { key: "notify.product_updates", label: t("productUpdates"), hint: t("productUpdatesHint") },
    { key: "notify.tips", label: t("tips"), hint: t("tipsHint") },
  ]

  function toggle(key: NotificationKey, enabled: boolean) {
    setSavingKey(key)
    startTransition(async () => {
      try {
        const result = await saveNotification(key, enabled)
        if (result.error) toast.error(result.error)
        else toast.success(t("saved"))
      } finally {
        setSavingKey(null)
      }
    })
  }

  return (
    <div className="divide-y">
      {rows.map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-6 py-4">
          <div className="space-y-1">
            <Label htmlFor={row.key}>{row.label}</Label>
            <p className="text-sm text-muted-foreground">{row.hint}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pending && savingKey === row.key && <Spinner aria-hidden="true" />}
            <Switch
              id={row.key}
              defaultChecked={values[row.key]}
              disabled={pending}
              onCheckedChange={(checked) => toggle(row.key, checked)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
