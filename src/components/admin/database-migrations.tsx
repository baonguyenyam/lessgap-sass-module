"use client"

import { useMutation } from "@tanstack/react-query"
import { CircleCheck, CircleHelp, Clock, DatabaseZap, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { applyDatabaseMigrations } from "@/app/actions/database"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
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
import type { TableQuery } from "@/lib/table-query"
import type { MigrationStatus } from "@/platform/database/migration-status"
import { StatusBadge } from "@/components/data-table/status-badge"

const CONFIRM_WORD = "MIGRATE"

/**
 * Admin → Database → Migrations (spec/adr/0023): whether the database is at
 * the build's contract, what is left, and the guarded button that applies it.
 */
export function DatabaseMigrations({
  status,
  pendingCount,
  migrations,
  total,
  query,
  defaults,
  backupFirst,
}: {
  status: MigrationStatus["state"]
  /** The number of migrations waiting to be applied. */
  pendingCount: number
  migrations: { name: string; status: "applied" | "pending" | "unknown" }[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  /** Whether a backup is taken before migrating (storage configured). */
  backupFirst: boolean
}) {
  const t = useTranslations("admin.database.migrations")
  const tCommon = useTranslations("dataTable")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")

  const columns = useMemo(() => {
    const col = dataTableColumns<(typeof migrations)[number]>()
    return col.columns([
      col.accessor("name", {
        id: "name",
        header: t("colName"),
        cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.name}</span>,
      }),
      col.accessor("status", {
        id: "status",
        header: t("colStatus"),
        // Badge
        cell: ({ row }) => (
          <StatusBadge
            tone={row.original.status === "applied" ? "success" : "warning"}
            icon={row.original.status === "applied" ? CircleCheck : Clock}
          >
            {t(`state.${row.original.status}`)}
          </StatusBadge>
        ),
      }),
    ])
  }, [t])

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
        <EmptyState
          tone="success"
          icon={CircleCheck}
          title={t("current.title")}
          description={t("current.description")}
        />
      )}
      {status === "unknown" && (
        <Alert variant="destructive">
          <CircleHelp />
          <AlertTitle>{t("unknown.title")}</AlertTitle>
          <AlertDescription>{t("unknown.description")}</AlertDescription>
        </Alert>
      )}
      {status === "behind" && <p className="text-sm text-muted-foreground">{t("behind", { count: pendingCount })}</p>}
      <DataTable
        columns={columns}
        data={migrations}
        total={total}
        query={query}
        defaults={defaults}
        getRowId={(migration) => migration.name}
        sortable={["name"]}
        searchPlaceholder={t("search")}
        empty={{ icon: CircleCheck, title: t("empty.title"), description: t("empty.description") }}
      />
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
