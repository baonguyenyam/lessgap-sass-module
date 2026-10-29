"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { startOnboarding } from "@/app/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OptionSelect } from "@/components/form/option-select"

/** The onboarding wizard's one-form submit (task 4.5, spec/06 steps 1-5):
 * name + vertical + slug (with the subdomain preview) + basics. */
export function OnboardingWizard({ verticals }: { verticals: { key: string; label: string }[] }) {
  const t = useTranslations("onboarding")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [vertical, setVertical] = useState(verticals[0]?.key ?? "generic")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const preview =
    slug ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  const submit = () =>
    startTransition(async () => {
      const r = await startOnboarding({ name, slug: slug || preview, vertical, phone, address })
      if (r.error) setError(r.error)
      else if (r.slug) router.push(`/t/${r.slug}` as never)
    })

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="ob-name">{t("name")}</Label>
        <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ob-vertical">{t("vertical")}</Label>
        <OptionSelect
          value={vertical}
          onValueChange={(v) => setVertical(v)}
          options={verticals.map((v) => ({ value: v.key, label: v.label }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ob-slug">{t("slug")}</Label>
        <Input id="ob-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={preview} />
        <p className="text-xs text-muted-foreground">{preview}.lessgap.io</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ob-phone">{t("phone")}</Label>
        <Input id="ob-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ob-address">{t("address")}</Label>
        <Input id="ob-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <Button className="w-full" disabled={pending || !name.trim() || !preview} onClick={submit}>
        {t("finish")}
      </Button>
      {error && <p className="text-sm text-destructive">{t(`errors.${error}`)}</p>}
    </div>
  )
}
