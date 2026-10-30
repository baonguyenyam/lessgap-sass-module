"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import type { TableQuery } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"

export type OrderRow = {
  id: string
  customerName: string
  items: string
  totalCents: number
  fulfilment: string
  status: string
  createdAt: string
}

/** The orders list (member-parity): every shop order in a DataTable with a
 * status facet — read-only, orders come from the site's shop page. */
export function OrdersTable({
  heading,
  rows,
  total,
  query,
  statuses,
}: {
  heading?: TableHeading
  rows: OrderRow[]
  total: number
  query: TableQuery
  statuses: string[]
}) {
  const t = useTranslations("dashboard.orders")
  const format = useFormatter()

  const columns = useMemo(() => {
    const col = dataTableColumns<OrderRow>()
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
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Badge variant="outline">{row.original.status}</Badge>
            <Badge variant="secondary">{row.original.fulfilment}</Badge>
          </div>
        ),
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
      heading={heading}
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={{ sort: "createdAt", dir: "desc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["createdAt", "totalCents", "customerName"]}
      searchPlaceholder={t("search")}
      filters={[{ key: "status", label: t("colStatus"), options: statuses.map((s) => ({ value: s, label: s })) }]}
      empty={{ icon: Package, title: t("empty"), description: t("empty_hint") }}
    />
  )
}
