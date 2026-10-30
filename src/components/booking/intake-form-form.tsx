"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createIntakeForm } from "@/app/actions/intake"

/** The create-a-form surface: name + comma-separated labels (each becomes a
 * `text` field). */
export function IntakeFormForm() {
  const t = useTranslations("dashboard.intake")
  const router = useRouter()
  const [name, setName] = useState("")
  const [labels, setLabels] = useState("")
  const [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const fields = labels
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((label) => ({ label, kind: "text" }))
    if (!name.trim() || fields.length === 0) return
    setPending(true)
    await createIntakeForm({ name, fields })
    setPending(false)
    setName("")
    setLabels("")
    router.refresh()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="if-name">{t("form_name")}</Label>
        <Input id="if-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="if-fields">{t("fields")}</Label>
        <Input
          id="if-fields"
          required
          placeholder={t("fields_placeholder")}
          value={labels}
          onChange={(e) => setLabels(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending || !name.trim() || !labels.trim()}>
        {pending ? t("adding") : t("add_button")}
      </Button>
    </form>
  )
}
