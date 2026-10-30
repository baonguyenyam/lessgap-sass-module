"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, X } from "lucide-react"

/** The site chat bubble (task 7.4): a bubble → sheet → question → POST
 * /api/chat → the answer + its sources. visitorKey persists in
 * sessionStorage so a conversation carries across messages. */
export function ChatBubble() {
  const t = useTranslations("site.chat")
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; sources?: string[] }[]>([])
  const [pending, setPending] = useState(false)
  // The visitor key lives in sessionStorage — read lazily inside the
  // submit handler so render stays pure (react-hooks/purity).
  function currentVisitorKey(): string {
    const existing = sessionStorage.getItem("chat_visitor")
    if (existing) return existing
    const key = `v_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem("chat_visitor", key)
    return key
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    const q = question.trim()
    setMessages((m) => [...m, { role: "user", content: q }])
    setQuestion("")
    setPending(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, visitorKey: currentVisitorKey() }),
      })
      const data = (await res.json()) as { answer?: string; sources?: string[]; error?: string }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer ?? t(`error.${data.error ?? "unknown"}`), sources: data.sources },
      ])
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t("error.unknown") }])
    }
    setPending(false)
  }
  return (
    <>
      <button
        type="button"
        aria-label={t("open")}
        onClick={() => setOpen(!open)}
        className="border-lg fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
      {open && (
        <div className="border-xl fixed right-4 bottom-20 z-40 flex h-96 w-80 flex-col rounded-lg border bg-background">
          <div className="border-b p-3 text-sm font-medium">{t("title")}</div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">{t("greeting")}</p>}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                <p
                  className={`inline-block rounded-lg px-3 py-1.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {m.content}
                </p>
                {m.sources && m.sources.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("sources")}: {m.sources.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t p-3">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
            />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "…" : t("send")}
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
