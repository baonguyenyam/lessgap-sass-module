"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { BarChart3 } from "lucide-react"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import type { TableQuery } from "@/lib/table-query"

export type PathRow = { path: string; views: number }

export function TopPathsTable({ rows, total, query }: { rows: PathRow[]; total: number; query: TableQuery }) {
  const t = useTranslations("dashboard.analytics")
  const columns = useMemo(() => {
    const col = dataTableColumns<PathRow>()
    return col.columns([
      col.accessor("path", {
        header: t("colPath"),
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
      }),
      col.accessor("views", {
        header: () => <span className="block text-right">{t("colViews")}</span>,
        cell: ({ getValue }) => <span className="block text-right text-muted-foreground">{getValue()}</span>,
      }),
    ])
  }, [t])

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={{ sort: "views", dir: "desc", pageSize: 10 }}
      getRowId={(row) => row.path}
      sortable={["views", "path"]}
      searchPlaceholder={t("search")}
      empty={{ icon: BarChart3, title: t("empty"), description: t("empty_hint") }}
    />
  )
}
