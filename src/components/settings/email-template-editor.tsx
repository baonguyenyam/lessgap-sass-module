"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveEmailTemplate, resetEmailTemplate } from "@/app/actions/email-templates"

export function EmailTemplateEditor({
  templateKey,
  locale,
  subject,
  html,
  customized,
}: {
  templateKey: string
  locale: string
  subject: string
  html: string
  customized: boolean
}) {
  const t = useTranslations("dashboard.settings.emails")
  const router = useRouter()
  const [s, setS] = useState(subject)
  const [h, setH] = useState(html)
  const [pending, setPending] = useState<string | null>(null)
  async function run(fn: () => Promise<{ error?: string } | { ok: true }>, reset = false) {
    setPending(reset ? "reset" : "save")
    await fn()
    setPending(null)
    router.refresh()
  }
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("subject")}</Label>
        <Input value={s} onChange={(e) => setS(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("body")}</Label>
        <Textarea rows={8} value={h} onChange={(e) => setH(e.target.value)} className="font-mono text-xs" />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending !== null}
          onClick={() => run(() => saveEmailTemplate({ templateKey, locale, subject: s, html: h }))}
        >
          {pending === "save" ? t("saving") : t("save")}
        </Button>
        {customized && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => run(() => resetEmailTemplate({ templateKey, locale }), true)}
          >
            {pending === "reset" ? t("resetting") : t("reset")}
          </Button>
        )}
      </div>
    </div>
  )
}
