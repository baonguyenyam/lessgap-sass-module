"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  reservationSlots,
  type ReservationRuleInput,
  type TableInput,
  type ExistingReservation,
} from "@/lib/booking/reservations"
import { reserveTable } from "@/app/actions/reservations"

/** The site reserve form (task 5.8): party size → slot → details. The slot
 * list recomputes client-side for the pick, and `reserveTable` re-checks it
 * server-side — the server is the authority. */
export function ReserveForm({
  tables,
  rules,
  existing,
  maxParty,
  range,
}: {
  tables: (TableInput & { name?: string })[]
  rules: ReservationRuleInput[]
  existing: ExistingReservation[]
  maxParty: number
  range: { startTs: string; endTs: string }
}) {
  const t = useTranslations("site.reserve")
  const [partySize, setPartySize] = useState(2)
  const [slot, setSlot] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const slots = reservationSlots(rules, tables, existing, partySize, range).slice(0, 40)
  const tableName = (id: string) => tables.find((x) => x.id === id)?.name ?? id
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const [tableId, startTs, endTs] = slot.split("|")
    const res = await reserveTable({ tableId, partySize, startTs, endTs, name, phone: phone || undefined })
    setPending(false)
    if (res.error) setError(res.error)
    else setDone(res.status)
  }
  if (done) return <p role="status">{t("confirmed")}</p>
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="party">{t("party_size")}</Label>
        <NativeSelect id="party" value={String(partySize)} onChange={(e) => setPartySize(Number(e.target.value))}>
          {Array.from({ length: maxParty }, (_, i) => (
            <NativeSelectOption key={i + 1} value={String(i + 1)}>
              {i + 1}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slot">{t("slot")}</Label>
        <NativeSelect id="slot" required value={slot} onChange={(e) => setSlot(e.target.value)}>
          <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
          {slots.map((s) => (
            <NativeSelectOption key={`${s.tableId}|${s.startTs}`} value={`${s.tableId}|${s.startTs}|${s.endTs}`}>
              {new Date(s.startTs).toUTCString()} · {tableName(s.tableId)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{t(`error.${error}`)}</p>}
      <Button type="submit" disabled={pending || !slot || !name}>
        {pending ? t("reserving") : t("reserve")}
      </Button>
    </form>
  )
}
