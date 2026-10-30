"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { ConvertButton } from "@/components/quotes/convert-button"
import type { TableQuery } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"

export type RequestRow = { id: string; customerName: string; customerEmail: string; status: string; createdAt: string }
export type QuoteRow = {
  id: string
  customerName: string
  items: string
  totalCents: number
  status: string
  createdAt: string
}

export function RequestsTable({ rows, total, query }: { rows: RequestRow[]; total: number; query: TableQuery }) {
  const t = useTranslations("dashboard.quotes")
  const format = useFormatter()
  const columns = useMemo(() => {
    const col = dataTableColumns<RequestRow>()
    return col.columns([
      col.accessor("customerName", {
        header: t("colCustomer"),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      col.accessor("customerEmail", {
        header: t("colEmail"),
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge>,
      }),
      col.accessor("createdAt", {
        header: t("colWhen"),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(toDate(getValue()), { dateStyle: "medium", timeStyle: "short" })}
          </span>
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
      defaults={{ sort: "createdAt", dir: "desc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["createdAt", "customerName"]}
      searchPlaceholder={t("search")}
      empty={{ icon: FileText, title: t("empty"), description: t("empty_hint") }}
    />
  )
}

export function QuotesTable({ rows, total, query }: { rows: QuoteRow[]; total: number; query: TableQuery }) {
  const t = useTranslations("dashboard.quotes")
  const format = useFormatter()
  const columns = useMemo(() => {
    const col = dataTableColumns<QuoteRow>()
    return col.columns([
      col.accessor("customerName", {
        header: t("colCustomer"),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      col.accessor("items", {
        header: t("colItems"),
        cell: ({ getValue }) => <span className="block max-w-xs truncate text-muted-foreground">{getValue()}</span>,
      }),
      col.accessor("totalCents", {
        header: () => <span className="block text-right">{t("colTotal")}</span>,
        cell: ({ getValue }) => <span className="block text-right">{(getValue() / 100).toFixed(2)}</span>,
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge>,
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => (row.original.status === "accepted" ? <ConvertButton quoteId={row.original.id} /> : null),
      }),
    ])
  }, [t])
  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={{ sort: "createdAt", dir: "desc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["createdAt", "totalCents", "customerName"]}
      searchPlaceholder={t("search")}
      empty={{ icon: FileText, title: t("empty"), description: t("empty_hint") }}
    />
  )
}
