"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { convertQuote } from "@/app/actions/quotes"

/** Convert an accepted quote to an order (task 6.6). */
export function ConvertButton({ quoteId }: { quoteId: string }) {
  const t = useTranslations("dashboard.quotes")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  if (done) return <span className="text-sm text-muted-foreground">{t("converted")}</span>
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await convertQuote({ quoteId })
        setPending(false)
        setDone(true)
      }}
    >
      {t("convert")}
    </Button>
  )
}
