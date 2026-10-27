"use client"

import { useMutation } from "@tanstack/react-query"
import { CircleCheck, CircleHelp, DatabaseZap, CircleDot, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { applyDatabaseMigrations } from "@/app/actions/database"
import { EmptyState } from "@/components/layout/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { MigrationStatus } from "@/platform/database/migration-status"

const CONFIRM_WORD = "MIGRATE"

/**
 * Admin → Database → Migrations (spec/adr/0023): whether the database is at
 * the build's contract, what is left, and the guarded button that applies it.
 */
export function DatabaseMigrations({
  status,
  pendingCount,
  migrations,
  backupFirst,
}: {
  status: MigrationStatus["state"]
  /** The number of migrations waiting to be applied. */
  pendingCount: number
  migrations: { name: string; status: "applied" | "pending" | "unknown" }[]
  /** Whether a backup is taken before migrating (storage configured). */
  backupFirst: boolean
}) {
  const t = useTranslations("admin.database.migrations")
  const tCommon = useTranslations("dataTable")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")

  const apply = useMutation({
    mutationFn: () => applyDatabaseMigrations(typed),
    onSuccess: (result) => {
      if (result.error) return void toast.error(result.error)
      toast.success(t("applied", { count: result.applied?.length ?? 0 }))
      setOpen(false)
      setTyped("")
      router.refresh()
    },
    onError: () => toast.error(t("failed")),
  })

  return (
    <div className="space-y-4">
      {status === "current" && (
        <EmptyState icon={CircleCheck} title={t("current.title")} description={t("current.description")} />
      )}
      {status === "unknown" && (
        <Alert variant="destructive">
          <CircleHelp />
          <AlertTitle>{t("unknown.title")}</AlertTitle>
          <AlertDescription>{t("unknown.description")}</AlertDescription>
        </Alert>
      )}
      {status === "behind" && <p className="text-sm text-muted-foreground">{t("behind", { count: pendingCount })}</p>}
      <ol className="divide-y rounded-[var(--radius)] border">
        {migrations.map((migration) => (
          <li key={migration.name} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {migration.status === "applied" ? (
                <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <CircleDot className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="truncate font-mono text-xs font-medium">{migration.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{t(`state.${migration.status}`)}</span>
            </span>
          </li>
        ))}
      </ol>
      {status === "behind" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={() => setOpen(true)}>
            <DatabaseZap />
            {t("apply", { count: pendingCount })}
          </Button>
          <p className="text-sm text-muted-foreground">{backupFirst ? t("backupFirst") : t("noBackup")}</p>
        </div>
      )}

      <AlertDialog open={open} onOpenChange={(next) => !apply.isPending && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.title", { count: pendingCount })}</AlertDialogTitle>
            <AlertDialogDescription>
              {backupFirst ? t("confirm.description") : t("confirm.descriptionNoBackup")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="migrate-confirm">{t("confirm.label", { word: CONFIRM_WORD })}</FieldLabel>
            <Input
              id="migrate-confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              disabled={apply.isPending}
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={apply.isPending}>
                <X />
                {tCommon("cancel")}
              </Button>
            </AlertDialogCancel>
            <Button onClick={() => apply.mutate()} disabled={typed !== CONFIRM_WORD || apply.isPending}>
              {apply.isPending ? <Spinner /> : <DatabaseZap />}
              {t("apply", { count: pendingCount })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
