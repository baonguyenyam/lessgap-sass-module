"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { submitQuoteRequest } from "@/app/actions/quotes"
import type { FormDefinition } from "@/lib/quotes/form"

/** The site quote request form (task 6.6): renders the tenant's
 * schema-driven fields — never free HTML (spec/07). */
export function QuoteRequestForm({ form }: { form: FormDefinition }) {
  const t = useTranslations("site.quote")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await submitQuoteRequest({
      customerName: name,
      customerEmail: email,
      customerPhone: phone || undefined,
      answers,
    })
    setPending(false)
    if (res.error) setError(res.error)
    else setDone(true)
  }
  if (done) return <p role="status">{t("submitted")}</p>
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="qn">{t("name")}</Label>
          <Input id="qn" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qe">{t("email")}</Label>
          <Input id="qe" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qp">{t("phone")}</Label>
        <Input id="qp" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {form.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`f_${f.key}`}>
            {f.label} {f.required && <span aria-hidden>*</span>}
          </Label>
          {f.kind === "select" ? (
            <NativeSelect
              id={`f_${f.key}`}
              required={f.required}
              value={(answers[f.key] as string) ?? ""}
              onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })}
            >
              <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
              {f.options.map((o) => (
                <NativeSelectOption key={o} value={o}>
                  {o}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <Input
              id={`f_${f.key}`}
              type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : f.kind === "file" ? "file" : "text"}
              required={f.required}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [f.key]: f.kind === "number" ? Number(e.target.value) : e.target.value,
                })
              }
            />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{t(`error.${error}`)}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  )
}
