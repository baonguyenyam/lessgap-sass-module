"use client"

import { Download, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  cancelModuleDataPurge,
  requestModuleDataExport,
  scheduleModuleDataPurge,
  setModuleEnabled,
} from "@/app/actions/modules"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

/**
 * The controls at the end of one module's row (task 2.10): a switch to turn
 * it on or off, and a "…" menu for its data — export, delete (asked in a
 * dialog where the module's name is typed), cancel a scheduled delete.
 * Results arrive as toasts; the page re-reads its rows after each change.
 */
export function ModuleActions({
  moduleKey,
  moduleName,
  enabled,
  purgeScheduled,
  tenantId,
}: {
  moduleKey: string
  moduleName: string
  enabled: boolean
  purgeScheduled: boolean
  tenantId?: string
}) {
  const t = useTranslations("dashboard.settings.modules")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState("")

  const run = (fn: () => Promise<{ error?: string }>, done: string, after?: () => void) =>
    startTransition(async () => {
      const result = await fn()
      if (result.error) toast.error(result.error)
      else {
        toast.success(done)
        after?.()
        router.refresh()
      }
    })

  return (
    <div className="flex shrink-0 items-center gap-2">
      {pending && <Spinner className="text-muted-foreground" />}
      <Switch
        checked={enabled}
        disabled={pending || purgeScheduled}
        aria-label={t(enabled ? "actions.disableNamed" : "actions.enableNamed", { name: moduleName })}
        onCheckedChange={(value) =>
          run(() => setModuleEnabled(moduleKey, value, tenantId), t(value ? "done.enabled" : "done.disabled"))
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("actions.menu", { name: moduleName })} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => run(() => requestModuleDataExport(moduleKey, tenantId), t("done.export"))}>
            <Download />
            {t("actions.export")}
          </DropdownMenuItem>
          {purgeScheduled ? (
            <DropdownMenuItem
              onSelect={() => run(() => cancelModuleDataPurge(moduleKey, tenantId), t("done.canceled"))}
            >
              <RotateCcw />
              {t("actions.cancel")}
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={enabled}
                onSelect={() => {
                  setTyped("")
                  setConfirming(true)
                }}
              >
                <Trash2 />
                {t("actions.delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.title", { name: moduleName })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`purge-${moduleKey}`}>{t("actions.typeName", { name: moduleName })}</Label>
            <Input
              id={`purge-${moduleKey}`}
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("confirm.keep")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending || typed.trim() !== moduleName}
              onClick={() =>
                run(
                  () => scheduleModuleDataPurge(moduleKey, typed, tenantId),
                  t("done.scheduled"),
                  () => setConfirming(false)
                )
              }
            >
              {pending && <Spinner />}
              {t("actions.confirmDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
