"use client"

import { useMutation } from "@tanstack/react-query"
import { CloudOff, DatabaseBackup, Download, TriangleAlert } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { toast } from "sonner"
import { backUpDatabase, backupDownloadUrl } from "@/app/actions/database"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import { RowActions } from "@/components/data-table/row-actions"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { byteUnit } from "@/lib/bytes"
import type { TableQuery } from "@/lib/table-query"

export type BackupRow = { key: string; takenAt: string; size: number }

/** Admin → Database → Backups (spec/adr/0023): take one, list them, download one. */
export function DatabaseBackups({
  configured,
  failed,
  rows,
  total,
  query,
  defaults,
}: {
  configured: boolean
  /** The bucket is configured but could not be listed (wrong keys, network). */
  failed: boolean
  rows: BackupRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
}) {
  const t = useTranslations("admin.database.backups")
  const format = useFormatter()
  const router = useRouter()

  const backup = useMutation({
    mutationFn: () => backUpDatabase(),
    onSuccess: (result) => {
      if (result.error) return void toast.error(result.error)
      toast.success(t("done"))
      router.refresh()
    },
    onError: () => toast.error(t("failed")),
  })

  const backupButton = (
    <Button onClick={() => backup.mutate()} disabled={backup.isPending}>
      {backup.isPending ? <Spinner /> : <DatabaseBackup />}
      {t("backUpNow")}
    </Button>
  )

  const columns = useMemo(() => {
    const col = dataTableColumns<BackupRow>()
    const download = async (key: string) => {
      const result = await backupDownloadUrl(key)
      if (result.url) window.location.assign(result.url)
      else toast.error(result.error ?? t("failed"))
    }
    return col.columns([
      col.accessor("takenAt", {
        id: "takenAt",
        header: t("colTakenAt"),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {format.dateTime(new Date(row.original.takenAt), "dateTime")}
          </span>
        ),
      }),
      col.accessor("size", {
        header: t("colSize"),
        cell: ({ row }) => {
          const { value, unit } = byteUnit(row.original.size)
          return (
            <span className="text-muted-foreground">
              {format.number(value, { style: "unit", unit, unitDisplay: "short" })}
            </span>
          )
        },
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => (
          <RowActions
            label={row.original.key}
            actions={[{ label: t("download"), icon: Download, onSelect: () => void download(row.original.key) }]}
          />
        ),
      }),
    ])
  }, [t, format])

  if (!configured) {
    return <EmptyState icon={CloudOff} title={t("notConfigured.title")} description={t("notConfigured.description")} />
  }
  if (failed) {
    return <EmptyState icon={TriangleAlert} title={t("listFailed.title")} description={t("listFailed.description")} />
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={defaults}
      getRowId={(row) => row.key}
      sortable={["takenAt"]}
      actions={backupButton}
      empty={{
        icon: DatabaseBackup,
        title: t("empty.title"),
        description: t("empty.description"),
        action: backupButton,
      }}
    />
  )
}
