"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { moderateReview } from "@/app/actions/reviews"

/** Approve/reject on a `pending` `Review` (task 11.4). */
export function ReviewActions({ id }: { id: string }) {
  const t = useTranslations("dashboard.reviews")
  const [pending, setPending] = useState<string | null>(null)
  async function act(status: "published" | "rejected") {
    setPending(status)
    await moderateReview({ id, status })
    setPending(null)
  }
  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" onClick={() => act("published")} disabled={pending !== null}>
        {pending === "published" ? t("publishing") : t("approve")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => act("rejected")} disabled={pending !== null}>
        {pending === "rejected" ? t("rejecting") : t("reject")}
      </Button>
    </div>
  )
}
