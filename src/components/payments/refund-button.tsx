"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { refundPayment } from "@/app/actions/payments"

/** Refund a payment (task 6.8): Stripe returns the fee proportionally. */
export function RefundButton({ paymentId }: { paymentId: string }) {
  const t = useTranslations("dashboard.payments")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  if (done) return <span className="text-sm text-muted-foreground">{t("refunded_done")}</span>
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await refundPayment({ paymentId })
        setPending(false)
        setDone(true)
      }}
    >
      {t("refund")}
    </Button>
  )
}
