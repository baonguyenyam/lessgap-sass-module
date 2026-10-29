"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { exportCustomer, deleteCustomer } from "@/app/actions/customers"

/** Customer row actions (task 5.5): export the customer's rows as JSON, or
 * delete them on a privacy request. */
export function CustomerActions({ customerId, name }: { customerId: string; name: string }) {
  const t = useTranslations("dashboard.customers")
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState<"exported" | "deleted" | null>(null)
  async function act(action: "export" | "delete") {
    setPending(true)
    if (action === "export") {
      const res = await exportCustomer({ customerId })
      if (res.json) {
        const blob = new Blob([res.json], { type: "application/json" })
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `customer-${customerId}.json`
        a.click()
        URL.revokeObjectURL(a.href)
      }
      setDone("exported")
    } else {
      await deleteCustomer({ customerId })
      setDone("deleted")
    }
    setPending(false)
  }
  if (done) return <span className="text-xs text-muted-foreground">{t(`done.${done}`)}</span>
  return (
    <span className="flex gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act("export")}>
        {t("export")}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (window.confirm(t("confirm_delete", { name }))) void act("delete")
        }}
      >
        {t("delete")}
      </Button>
    </span>
  )
}
