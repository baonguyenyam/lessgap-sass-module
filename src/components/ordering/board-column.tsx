"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { setOrderStatus } from "@/app/actions/ordering"
import { EmptyState } from "@/components/layout/empty-state"
import { ClipboardList } from "lucide-react"

/** One board column (task 6.5): each card advances its order one status. */
export function BoardColumn({
  orders,
  nextStatus,
}: {
  orders: { id: string; customerName: string; lines: string[]; pickupSlot: string | null; createdAt: string }[]
  nextStatus: string | null
}) {
  const t = useTranslations("dashboard.ordering")
  const [pending, setPending] = useState<string | null>(null)
  if (orders.length === 0) return <EmptyState icon={ClipboardList} title={t("empty")} size="compact" />
  return (
    <>
      {orders.map((o) => (
        <div key={o.id} className="rounded-md border p-2 text-sm">
          <p className="font-medium">{o.customerName}</p>
          <p className="text-xs text-muted-foreground">{o.lines.join(", ")}</p>
          <p className="text-xs text-muted-foreground">{o.pickupSlot ?? o.createdAt}</p>
          {nextStatus && (
            <Button
              size="sm"
              variant="outline"
              className="mt-1 w-full"
              disabled={pending === o.id}
              onClick={async () => {
                setPending(o.id)
                await setOrderStatus({ orderId: o.id, toStatus: nextStatus })
                setPending(null)
              }}
            >
              {t(`status.${nextStatus}`)}
            </Button>
          )}
        </div>
      ))}
    </>
  )
}
