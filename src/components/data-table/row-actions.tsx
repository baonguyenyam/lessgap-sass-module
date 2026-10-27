"use client"

import { useMutation } from "@tanstack/react-query"
import { MoreHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog, type ConfirmCopy } from "@/components/data-table/confirm-dialog"

/**
 * One item of a row's actions menu. `onSelect` is for something local (open
 * the edit drawer, copy a value); `run` is a server mutation, run through
 * TanStack Query, that refreshes the list when it succeeds.
 */
export type RowAction = {
  label: string
  variant?: "destructive"
  confirm?: ConfirmCopy
} & ({ onSelect: () => void; run?: never } | { run: () => Promise<unknown>; onSelect?: never })

/** The "⋯" menu at the end of a row. Destructive items come last, after a separator. */
export function RowActions({ actions, label }: { actions: RowAction[]; label: string }) {
  const t = useTranslations("dataTable")
  const router = useRouter()
  const [confirming, setConfirming] = useState<RowAction | null>(null)
  const mutation = useMutation({
    mutationFn: (action: RowAction) => action.run!(),
    onSuccess: () => {
      toast.success(t("done"))
      router.refresh()
    },
    onError: () => toast.error(t("failed")),
  })

  if (actions.length === 0) return null
  const select = (action: RowAction) => {
    if (action.confirm) setConfirming(action)
    else if (action.run) mutation.mutate(action)
    else action.onSelect?.()
  }
  const normal = actions.filter((a) => a.variant !== "destructive")
  const destructive = actions.filter((a) => a.variant === "destructive")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("actionsFor", { label })} disabled={mutation.isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {normal.map((action) => (
            <DropdownMenuItem key={action.label} onSelect={() => select(action)}>
              {action.label}
            </DropdownMenuItem>
          ))}
          {normal.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
          {destructive.map((action) => (
            <DropdownMenuItem key={action.label} className="text-destructive focus:text-destructive" onSelect={() => select(action)}>
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        copy={confirming?.confirm ?? null}
        pending={mutation.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return
          if (confirming.run) mutation.mutate(confirming, { onSettled: () => setConfirming(null) })
          else {
            confirming.onSelect?.()
            setConfirming(null)
          }
        }}
      />
    </>
  )
}
