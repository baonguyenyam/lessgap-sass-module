"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { saveNotification } from "@/app/actions/user-settings"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { NotificationKey } from "@/platform/settings/user"

export function NotificationSwitches({ values }: { values: Record<NotificationKey, boolean> }) {
  const t = useTranslations("dashboard.account.notifications")
  const [pending, startTransition] = useTransition()
  const rows: { key: NotificationKey; label: string; hint: string }[] = [
    { key: "notify.product_updates", label: t("productUpdates"), hint: t("productUpdatesHint") },
    { key: "notify.tips", label: t("tips"), hint: t("tipsHint") },
  ]

  function toggle(key: NotificationKey, enabled: boolean) {
    startTransition(async () => {
      const result = await saveNotification(key, enabled)
      if (result.error) toast.error(result.error)
      else toast.success(t("saved"))
    })
  }

  return (
    <div className="divide-y rounded-lg border">
      {rows.map((row) => (
        <div key={row.key} className="flex items-start justify-between gap-6 p-4">
          <div className="space-y-1">
            <Label htmlFor={row.key}>{row.label}</Label>
            <p className="text-sm text-muted-foreground">{row.hint}</p>
          </div>
          <Switch
            id={row.key}
            defaultChecked={values[row.key]}
            disabled={pending}
            onCheckedChange={(checked) => toggle(row.key, checked)}
          />
        </div>
      ))}
    </div>
  )
}
