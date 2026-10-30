"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPackage, createMembership } from "@/app/actions/products"

export function ProductForm({ kind }: { kind: "package" | "membership" }) {
  const t = useTranslations("dashboard.products")
  const router = useRouter()
  const [name, setName] = useState("")
  const [sessions, setSessions] = useState("")
  const [price, setPrice] = useState("")
  const [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !price) return
    if (kind === "package" && !sessions) return
    setPending(true)
    const priceCents = Math.round(Number(price) * 100)
    if (kind === "package") await createPackage({ name, sessions: Number(sessions), priceCents })
    else await createMembership({ name, priceCents })
    setPending(false)
    setName("")
    setSessions("")
    setPrice("")
    router.refresh()
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor={`${kind}-name`}>{t("name")}</Label>
        <Input id={`${kind}-name`} required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {kind === "package" && (
        <div className="w-24 space-y-1.5">
          <Label htmlFor="pkg-sessions">{t("sessions")}</Label>
          <Input id="pkg-sessions" type="number" required min={1} value={sessions} onChange={(e) => setSessions(e.target.value)} />
        </div>
      )}
      <div className="w-24 space-y-1.5">
        <Label htmlFor={`${kind}-price`}>{t("price")}</Label>
        <Input id={`${kind}-price`} type="number" required min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="self-end">
        <Button type="submit" disabled={pending || !name.trim() || !price}>
          {pending ? t("adding") : t("add_button")}
        </Button>
      </div>
    </form>
  )
}
