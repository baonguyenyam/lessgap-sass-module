"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** What a destructive action asks before it runs. Text may use `{count}`. */
export type ConfirmCopy = { title: string; description: string; confirmLabel: string }

/** Open while `copy` is set. The action button stays on screen until the work finishes. */
export function ConfirmDialog({
  copy,
  count = 1,
  pending,
  onCancel,
  onConfirm,
}: {
  copy: ConfirmCopy | null
  count?: number
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useTranslations("dataTable")
  const fill = (text: string) => text.replaceAll("{count}", String(count))

  return (
    <AlertDialog open={copy !== null} onOpenChange={(open) => !open && !pending && onCancel()}>
      <AlertDialogContent>
        {copy && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{fill(copy.title)}</AlertDialogTitle>
              <AlertDialogDescription>{fill(copy.description)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline" disabled={pending}>
                  {t("cancel")}
                </Button>
              </AlertDialogCancel>
              <Button variant="destructive" onClick={onConfirm} disabled={pending}>
                {pending && <Spinner />}
                {fill(copy.confirmLabel)}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
