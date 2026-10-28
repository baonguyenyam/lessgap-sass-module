"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { saveSiteSettings } from "@/app/actions/site"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
type Profile = { name?: string; tagline?: string; phone?: string; email?: string; address?: string }

/** The site content form (task 3.3): profile fields, seven hour rows and the
 * accent colour — plain inputs, the server validates everything again. */
export function SiteSettingsForm({
  initial,
}: {
  initial: {
    profile?: Profile | null
    hours?: Record<string, string> | null
    appearance?: { accentColor?: string } | null
  }
}) {
  const t = useTranslations("dashboard.settings.site")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const p = initial.profile ?? {}
  const h = initial.hours ?? {}

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const hours: Record<string, string> = {}
    for (const day of DAYS) hours[day] = String(fd.get(`hours.${day}`) ?? "")
    startTransition(async () => {
      const r = await saveSiteSettings({
        name: String(fd.get("name") ?? ""),
        tagline: String(fd.get("tagline") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        email: String(fd.get("email") ?? ""),
        address: String(fd.get("address") ?? ""),
        hours,
        accentColor: String(fd.get("accentColor") ?? ""),
      })
      setError(r.error ?? null)
      setSaved(!r.error)
    })
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("profile")}</h2>
        {(["name", "tagline", "phone", "email", "address"] as const).map((field) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>{t(`fields.${field}`)}</Label>
            <Input id={field} name={field} defaultValue={p[field] ?? ""} required={field === "name"} />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("hours")}</h2>
        {DAYS.map((day) => (
          <div key={day} className="flex items-center gap-3">
            <Label htmlFor={`hours.${day}`} className="w-16">
              {t(`days.${day}`)}
            </Label>
            <Input
              id={`hours.${day}`}
              name={`hours.${day}`}
              defaultValue={h[day] === "closed" ? "" : (h[day] ?? "")}
              placeholder={t("hoursPlaceholder")}
              className="w-40"
            />
            <span className="text-xs text-muted-foreground">{t("hoursHint")}</span>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("appearance")}</h2>
        <div className="space-y-2">
          <Label htmlFor="accentColor">{t("fields.accentColor")}</Label>
          <Input
            id="accentColor"
            name="accentColor"
            defaultValue={initial.appearance?.accentColor ?? ""}
            placeholder="#0ea5e9"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">{t("saved")}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}
