"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveChatbotSettings } from "@/app/actions/chatbot"

/** Chatbot settings (task 7.4): tone + languages, saved to TenantSetting. */
export function ChatbotSettingsForm({ tone, languages }: { tone: string; languages: string }) {
  const t = useTranslations("dashboard.chatbot")
  const [toneValue, setTone] = useState(tone)
  const [langs, setLangs] = useState(languages)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        await saveChatbotSettings({
          tone: toneValue || undefined,
          languages: langs
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
        })
        setPending(false)
        setDone(true)
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="tone">{t("tone")}</Label>
        <Input id="tone" value={toneValue} onChange={(e) => setTone(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="langs">{t("languages")}</Label>
        <Input id="langs" value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="en,vi" />
      </div>
      {done && (
        <p className="text-sm text-muted-foreground" role="status">
          {t("saved")}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {t("save")}
      </Button>
    </form>
  )
}
