"use client"

import { useTranslations } from "next-intl"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function UpgradeButton({
  priceId,
  className,
  children,
  disabled,
  variant = "default",
}: {
  priceId: string
  className?: string
  children?: React.ReactNode
  disabled?: boolean
  variant?: "default" | "outline" | "gradient"
}) {
  const t = useTranslations("billing.upgrade")
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // The API's own message goes to the console, not into the toast: it is
        // written for whoever is wiring Stripe up ("Billing is not
        // configured"), it is the last English string that could reach a user
        // in this flow, and there is nothing a customer can do with it.
        console.error("[checkout] failed:", data.error ?? res.status)
        toast.error(t("error"))
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      toast.error(t("error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={disabled || loading} variant={variant} className={className}>
      {loading && <Spinner />}
      {children ?? t("upgrade")}
    </Button>
  )
}
