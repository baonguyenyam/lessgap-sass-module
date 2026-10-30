"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Check, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications"

function MarkRead({ id, tenantId }: { id: string; tenantId: string }) {
  const t = useTranslations("dashboard.notifications")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={t("markRead")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationRead({ id, tenantId })
          router.refresh()
        })
      }
    >
      <Check size={16} />
    </Button>
  )
}

function MarkAll({ tenantId, disabled }: { tenantId: string; disabled: boolean }) {
  const t = useTranslations("dashboard.notifications")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      disabled={pending || disabled}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead({ tenantId })
          router.refresh()
        })
      }
    >
      <CheckCheck size={16} className="mr-1.5" />
      {t("markAll")}
    </Button>
  )
}

export const NotificationList = { MarkRead, MarkAll }
