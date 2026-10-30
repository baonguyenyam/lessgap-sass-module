"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { Utensils } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import type { TableQuery } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"

export type ReservationRow = {
  id: string
  name: string
  partySize: number
  tableName: string | null
  status: string
  startTs: string
}

export function ReservationsTable({
  heading,
  rows,
  total,
  query,
  statuses,
}: {
  heading?: TableHeading
  rows: ReservationRow[]
  total: number
  query: TableQuery
  statuses: string[]
}) {
  const t = useTranslations("dashboard.reservations")
  const format = useFormatter()
  const columns = useMemo(() => {
    const col = dataTableColumns<ReservationRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      col.accessor("partySize", { header: t("colParty"), cell: ({ getValue }) => t("party", { size: getValue() }) }),
      col.accessor("startTs", {
        header: t("colWhen"),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(toDate(getValue()), { dateStyle: "medium", timeStyle: "short" })}
          </span>
        ),
      }),
      col.accessor("tableName", { header: t("colTable"), cell: ({ getValue }) => getValue() ?? "—" }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge>,
      }),
    ])
  }, [t, format])

  return (
    <DataTable
      heading={heading}
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={{ sort: "startTs", dir: "asc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["startTs", "name", "partySize"]}
      searchPlaceholder={t("search")}
      filters={[{ key: "status", label: t("colStatus"), options: statuses.map((s) => ({ value: s, label: s })) }]}
      empty={{ icon: Utensils, title: t("empty"), description: t("empty_hint") }}
    />
  )
}
