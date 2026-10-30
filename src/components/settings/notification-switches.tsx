"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { saveNotification } from "@/app/actions/user-settings"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  isRequiredNotificationKey,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationKey,
} from "@/platform/settings/user"

export function NotificationSwitches({
  values,
}: {
  values: Record<NotificationCategory, Record<NotificationChannel, boolean>>
}) {
  const t = useTranslations("dashboard.account.notifications")
  const [pending, startTransition] = useTransition()
  const [savingKey, setSavingKey] = useState<NotificationKey | null>(null)

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
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-3 border-b pb-2 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
        <span>{t("category")}</span>
        {NOTIFICATION_CHANNELS.map((channel) => (
          <span key={channel} className="text-center">
            {t(`channels.${channel}`)}
          </span>
        ))}
      </div>
      <div className="divide-y divide-border">
        {NOTIFICATION_CATEGORIES.map(({ key: category }) => (
          <div
            key={category}
            className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]"
          >
            <Label htmlFor={`notify.${category}.in_app`}>{t(`categories.${category}`)}</Label>
            {NOTIFICATION_CHANNELS.map((channel) => {
              const key = `notify.${category}.${channel}` as NotificationKey
              const required = isRequiredNotificationKey(key)
              return (
                <div key={channel} className="flex items-center justify-center gap-2">
                  {pending && savingKey === key && <Spinner aria-hidden="true" />}
                  <Switch
                    id={key}
                    aria-label={t("toggleChannel", {
                      category: t(`categories.${category}`),
                      channel: t(`channels.${channel}`),
                    })}
                    checked={required || values[category][channel]}
                    disabled={pending || required}
                    onCheckedChange={(checked) => toggle(key, checked)}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
