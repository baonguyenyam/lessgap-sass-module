"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { startConnectOnboarding } from "@/app/actions/payments"

/** Connect Stripe (task 6.3): redirects to Stripe-hosted onboarding. */
export function ConnectButton() {
  const t = useTranslations("dashboard.settings.payments")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function go() {
    setPending(true)
    const res = await startConnectOnboarding()
    setPending(false)
    if (res.url) window.location.href = res.url
    else setError(res.error ?? "error")
  }
  return (
    <div>
      <Button onClick={go} disabled={pending}>
        {pending ? t("connecting") : t("connect")}
      </Button>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
