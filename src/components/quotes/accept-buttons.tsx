"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { acceptQuote, declineQuote } from "@/app/actions/quotes"

/** Accept or decline a quote by its signed token (task 6.6). */
export function AcceptButtons({ token }: { token: string }) {
  const t = useTranslations("site.quote")
  const [done, setDone] = useState<"accepted" | "declined" | null>(null)
  const [pending, setPending] = useState(false)
  if (done) return <p role="status">{t(done)}</p>
  return (
    <div className="flex gap-2">
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true)
          const res = await acceptQuote({ token })
          setPending(false)
          if (res.checkoutUrl) window.location.href = res.checkoutUrl
          else setDone("accepted")
        }}
      >
        {t("accept")}
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          await declineQuote({ token })
          setPending(false)
          setDone("declined")
        }}
      >
        {t("decline")}
      </Button>
    </div>
  )
}
