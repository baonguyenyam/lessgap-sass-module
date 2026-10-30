"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** The header bell (phase 17.1): links to the feed; a dot shows unread. The
 * page itself lists and marks — the bell stays an affordance, not a panel. */
export function NotificationBell({ unread, href }: { unread: number; href: string }) {
  const t = useTranslations("dashboard.notifications")
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("title")} asChild>
          <Link href={href as never} className="relative">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("title")}</TooltipContent>
    </Tooltip>
  )
}
