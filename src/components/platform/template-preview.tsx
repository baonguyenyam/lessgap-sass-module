"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendTestEmail } from "@/app/actions/platform-emails"

/** Send-test for a template + locale (task 5.6): staff only, to an address
 * they type — never a tenant's customer. */
export function TemplatePreview({ templateKey, locale }: { templateKey: string; locale: string }) {
  const t = useTranslations("platform.emails.templates")
  const [to, setTo] = useState("")
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  async function send() {
    setPending(true)
    const res = await sendTestEmail({ templateKey, locale, to })
    setPending(false)
    if (!res.error) setDone(true)
  }
  if (done) return <p className="text-xs text-muted-foreground">{t("sent")}</p>
  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        placeholder={t("send_to")}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="h-8 w-56 text-sm"
        aria-label={t("send_to")}
      />
      <Button size="sm" variant="outline" disabled={!to || pending} onClick={send}>
        {pending ? t("sending") : t("send_test")}
      </Button>
    </div>
  )
}
