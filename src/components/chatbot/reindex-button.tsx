"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { reindexNow } from "@/app/actions/chatbot"

/** Re-index the tenant's knowledge sources (task 7.4) — enqueues the job. */
export function ReindexButton() {
  const t = useTranslations("dashboard.chatbot")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await reindexNow()
        setPending(false)
        setDone(true)
      }}
    >
      {pending ? t("reindexing") : done ? t("reindexed") : t("reindex")}
    </Button>
  )
}
