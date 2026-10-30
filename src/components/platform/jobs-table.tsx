"use client"

import { ListChecks, Play, RotateCcw } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { retryJobAction, runJobNowAction } from "@/app/actions/platform-ops"
import type { TableQuery } from "@/lib/table-query"
import type { JobStatus } from "@/lib/job-status"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import { RowActions } from "@/components/data-table/row-actions"
import { StatusBadge, type StatusMap } from "@/components/data-table/status-badge"
import { CircleCheck, CircleX, Clock, LoaderCircle } from "lucide-react"

export type JobRow = {
  id: string
  kind: string
  status: JobStatus
  runAt: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  tenantId: string | null
  finishedAt: string | null
}

const STATUSES: StatusMap<JobStatus> = {
  QUEUED: { tone: "muted", icon: Clock },
  RUNNING: { tone: "info", icon: LoaderCircle },
  SUCCEEDED: { tone: "success", icon: CircleCheck },
  FAILED: { tone: "danger", icon: CircleX },
}

type Props = {
  rows: JobRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  kinds: string[]
}

export function JobsTable({ rows, total, query, defaults, kinds }: Props) {
  const t = useTranslations("platform.jobs")
  const format = useFormatter()

  const columns = useMemo(() => {
    const col = dataTableColumns<JobRow>()
    return col.columns([
      col.accessor("kind", {
        header: t("colKind"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.kind}</span>,
      }),
      col.accessor("status", {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => (
          <StatusBadge {...STATUSES[row.original.status]}>{t(`status.${row.original.status}`)}</StatusBadge>
        ),
      }),
      col.accessor("attempts", {
        header: t("colAttempts"),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.original.attempts}/{row.original.maxAttempts}
          </span>
        ),
      }),
      col.accessor("runAt", {
        id: "runAt",
        header: t("colRunAt"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.runAt), "dateTime")}
          </span>
        ),
      }),
      col.accessor("lastError", {
        header: t("colLastError"),
        cell: ({ row }) => (
          <span className="block max-w-64 truncate font-mono text-xs text-muted-foreground">
            {row.original.lastError ?? "—"}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) =>
          row.original.status === "FAILED" || row.original.status === "QUEUED" ? (
            <RowActions
              label={row.original.kind}
              actions={[
                ...(row.original.status === "FAILED"
                  ? [{ label: t("retry"), icon: RotateCcw, run: () => retryJobAction(row.original.id) }]
                  : []),
                ...(row.original.status === "QUEUED"
                  ? [{ label: t("runNow"), icon: Play, run: () => runJobNowAction(row.original.id) }]
                  : []),
              ]}
            />
          ) : null,
      }),
    ])
  }, [t, format])

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={defaults}
      getRowId={(row) => row.id}
      sortable={["kind", "runAt", "createdAt"]}
      searchPlaceholder={t("search")}
      filters={[
        { key: "status", label: t("colStatus"), options: JOB_STATUSES_OPT() },
        { key: "kind", label: t("colKind"), options: kinds.map((k) => ({ value: k, label: k })) },
      ]}
      empty={{ icon: ListChecks, title: t("empty.title"), description: t("empty.description") }}
    />
  )

  function JOB_STATUSES_OPT() {
    return (["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))
  }
}
