"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Checkbox } from "@/components/ui/checkbox"
import { bookAppointment } from "@/app/actions/booking"

/** The site booking form (task 5.4): service → staff → slot → details →
 * consent → submit. Server-side validation is the authority. */
export function BookingForm({
  services,
  staff,
  slots,
}: {
  services: { id: string; name: string; durationMinutes: number }[]
  staff: { id: string; name: string }[]
  slots: { startTs: string; endTs: string; staffId: string; label: string }[]
}) {
  const t = useTranslations("site.booking")
  const [serviceId, setServiceId] = useState("")
  const [staffId, setStaffId] = useState("any")
  const [slot, setSlot] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [marketing, setMarketing] = useState(false)
  const [sms, setSms] = useState(false)
  const [done, setDone] = useState<{ id: string; status: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const filtered = slots.filter((s) => staffId === "any" || s.staffId === staffId)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const [startTs, endTs] = slot.split("|")
    const chosen = slots.find((s) => s.startTs === startTs && s.endTs === endTs)
    const res = await bookAppointment({
      serviceId,
      staffId: chosen?.staffId,
      startTs,
      endTs,
      name,
      email: email || undefined,
      phone: phone || undefined,
      marketingConsent: marketing,
      smsConsent: sms,
    })
    setPending(false)
    if (res.error) setError(res.error)
    else setDone(res)
  }
  if (done) return <p role="status">{done.status === "requested" ? t("requested") : t("confirmed")}</p>
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="svc">{t("service")}</Label>
        <NativeSelect id="svc" required value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          {services.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name} · {s.durationMinutes}m
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="staff">{t("staff")}</Label>
        <NativeSelect id="staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <NativeSelectOption value="any">{t("any_staff")}</NativeSelectOption>
          {staff.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot">{t("slot")}</Label>
        <NativeSelect id="slot" required value={slot} onChange={(e) => setSlot(e.target.value)}>
          <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          {filtered.map((s) => (
            <NativeSelectOption key={`${s.startTs}|${s.endTs}`} value={`${s.startTs}|${s.endTs}`}>
              {s.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} />
        {t("marketing_consent")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={sms} onCheckedChange={(v) => setSms(v === true)} />
        {t("sms_consent")}
      </label>
      {error && <p className="text-sm text-destructive">{t(`error.${error}`)}</p>}
      <Button type="submit" disabled={pending || !serviceId || !slot || !name || (!email && !phone)}>
        {pending ? t("booking") : t("book")}
      </Button>
    </form>
  )
}
