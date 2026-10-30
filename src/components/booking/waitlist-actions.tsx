"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { moderateWaitlist } from "@/app/actions/waitlist"

export function WaitlistActions({ entryId, status }: { entryId: string; status: string }) {
  const t = useTranslations("dashboard.waitlist")
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  async function run(next: "canceled" | "booked") {
    setPending(next)
    await moderateWaitlist({ entryId, status: next })
    setPending(null)
    router.refresh()
  }
  if (status === "canceled" || status === "booked") return null
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => run("booked")}>
        {pending === "booked" ? "…" : t("mark_booked")}
      </Button>
      <Button size="sm" variant="outline" disabled={pending !== null} onClick={() => run("canceled")}>
        {pending === "canceled" ? "…" : t("mark_canceled")}
      </Button>
    </div>
  )
}
