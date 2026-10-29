"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { manageAppointment } from "@/app/actions/booking"

/** The manage-booking form (task 5.4): reschedule to another slot or cancel. */
export function ManageForm({
  token,
  status,
  slots,
}: {
  token: string
  status: string
  slots: { startTs: string; endTs: string; staffId: string; label: string }[]
}) {
  const t = useTranslations("site.booking")
  const [slot, setSlot] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const terminal = ["completed", "canceled"].includes(status)
  async function act(action: "reschedule" | "cancel") {
    setPending(true)
    const [startTs, endTs] = slot.split("|")
    const res = await manageAppointment(
      action === "cancel" ? { token, toStatus: "canceled" } : { token, startTs, endTs }
    )
    setPending(false)
    if (res.error) setError(res.error)
    else setDone(action)
  }
  if (error) return <p role="status">{t(`error.${error}`)}</p>
  if (done) return <p role="status">{t(`done.${done}`)}</p>
  if (terminal) return <p className="text-sm text-muted-foreground">{t(`status.${status}`)}</p>
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nslot">{t("new_slot")}</Label>
        <NativeSelect id="nslot" value={slot} onChange={(e) => setSlot(e.target.value)}>
          <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          {slots.map((s) => (
            <NativeSelectOption key={`${s.startTs}|${s.endTs}`} value={`${s.startTs}|${s.endTs}`}>
              {s.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!slot || pending} onClick={() => act("reschedule")}>
          {t("reschedule")}
        </Button>
        <Button variant="destructive" disabled={pending} onClick={() => act("cancel")}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  )
}
