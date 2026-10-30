"use client"

import { CheckCheck, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { resolveError } from "@/app/actions/platform-ops"
import type { TableQuery } from "@/lib/table-query"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import { RowActions } from "@/components/data-table/row-actions"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/data-table/status-badge"
import { CircleAlert, CircleCheck } from "lucide-react"

export type ErrorRow = {
  id: string
  digest: string
  source: string
  name: string
  message: string
  count: number
  tenantSlug: string | null
  firstSeenAt: string
  lastSeenAt: string
  resolvedAt: string | null
}

type Props = {
  rows: ErrorRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  sources: string[]
}

export function ErrorsTable({ rows, total, query, defaults, sources }: Props) {
  const t = useTranslations("platform.errors")
  const format = useFormatter()

  const columns = useMemo(() => {
    const col = dataTableColumns<ErrorRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.original.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{row.original.message}</p>
          </div>
        ),
      }),
      col.accessor("source", {
        header: t("colSource"),
        cell: ({ row }) => <Badge variant="outline">{row.original.source}</Badge>,
      }),
      col.accessor("count", {
        header: t("colCount"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.count}</span>,
      }),
      col.accessor("tenantSlug", {
        header: t("colTenant"),
        cell: ({ row }) =>
          row.original.tenantSlug ? (
            <Link
              href={`/platform/tenants/${row.original.tenantSlug}`}
              className="font-mono text-xs text-muted-foreground hover:underline"
            >
              {row.original.tenantSlug}
            </Link>
          ) : (
            "—"
          ),
      }),
      col.accessor("lastSeenAt", {
        id: "lastSeenAt",
        header: t("colLastSeen"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.lastSeenAt), "dateTime")}
          </span>
        ),
      }),
      col.accessor("resolvedAt", {
        id: "resolvedAt",
        header: t("colResolved"),
        cell: ({ row }) =>
          row.original.resolvedAt ? (
            <StatusBadge tone="success" icon={CircleCheck}>
              {t("resolved")}
            </StatusBadge>
          ) : (
            <StatusBadge tone="danger" icon={CircleAlert}>
              {t("open")}
            </StatusBadge>
          ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) =>
          row.original.resolvedAt ? null : (
            <RowActions
              label={row.original.name}
              actions={[{ label: t("resolve"), icon: CheckCheck, run: () => resolveError(row.original.id) }]}
            />
          ),
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
      sortable={["lastSeenAt", "count", "name"]}
      searchPlaceholder={t("search")}
      filters={[
        { key: "source", label: t("colSource"), options: sources.map((s) => ({ value: s, label: s })) },
        {
          key: "resolved",
          label: t("colResolved"),
          options: [
            { value: "open", label: t("open") },
            { value: "resolved", label: t("resolved") },
          ],
        },
      ]}
      empty={{ icon: TriangleAlert, title: t("empty.title"), description: t("empty.description") }}
    />
  )
}
