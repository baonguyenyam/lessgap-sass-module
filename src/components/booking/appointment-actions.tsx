"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { setAppointmentStatus } from "@/app/actions/appointments"
import { useState } from "react"

/** Calendar row actions (task 5.3): a staff filter and the status buttons
 * the appointment's current state allows. */
export function AppointmentActions({
  appointmentId,
  status,
  staff,
}: {
  appointmentId?: string
  status?: string
  staff?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const t = useTranslations("dashboard.calendar")
  const [pending, setPending] = useState(false)
  async function transition(toStatus: string) {
    if (!appointmentId) return
    setPending(true)
    try {
      await setAppointmentStatus({ appointmentId, toStatus })
    } finally {
      setPending(false)
    }
  }
  if (staff) {
    return (
      <label className="flex items-center gap-2 text-sm">
        {t("filter")}
        <NativeSelect
          size="sm"
          defaultValue=""
          onChange={(e) => {
            const p = new URLSearchParams(window.location.search)
            if (e.target.value) p.set("staff", e.target.value)
            else p.delete("staff")
            router.push(`?${p.toString()}` as never)
          }}
        >
          <NativeSelectOption value="">{t("all_staff")}</NativeSelectOption>
          {staff.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
    )
  }
  const next: Record<string, { label: string; to: string }[]> = {
    requested: [
      { label: t("confirm"), to: "confirmed" },
      { label: t("cancel"), to: "canceled" },
    ],
    confirmed: [
      { label: t("complete"), to: "completed" },
      { label: t("no_show"), to: "no_show" },
      { label: t("cancel"), to: "canceled" },
    ],
  }
  const actions = status ? (next[status] ?? []) : []
  if (actions.length === 0) return null
  return (
    <span className="flex gap-2">
      {actions.map((a) => (
        <Button
          key={a.to}
          size="sm"
          variant={a.to === "confirmed" || a.to === "completed" ? "default" : "outline"}
          disabled={pending}
          onClick={() => transition(a.to)}
        >
          {a.label}
        </Button>
      ))}
    </span>
  )
}
