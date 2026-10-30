"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import type { TableQuery } from "@/lib/table-query"
import { toDate } from "@/lib/timestamps"

export type PaymentRow = {
  id: string
  kind: string
  amountCents: number
  currency: string
  feeCents: number
  status: string
  createdAt: string
}

/** The payments list (member-parity): money in and out, in a DataTable with a
 * status facet — read-only, deposits/orders/quotes land here. */
export function PaymentsTable({
  heading,
  rows,
  total,
  query,
  statuses,
}: {
  heading?: TableHeading
  rows: PaymentRow[]
  total: number
  query: TableQuery
  statuses: string[]
}) {
  const t = useTranslations("dashboard.payments")
  const format = useFormatter()
  const columns = useMemo(() => {
    const col = dataTableColumns<PaymentRow>()
    return col.columns([
      col.accessor("kind", {
        header: t("colKind"),
        cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge>,
      }),
      col.accessor("amountCents", {
        header: () => <span className="block text-right">{t("colAmount")}</span>,
        cell: ({ row }) => (
          <span className="block text-right">
            {(row.original.amountCents / 100).toFixed(2)} {row.original.currency}
            {row.original.feeCents > 0 && (
              <span className="block text-xs text-muted-foreground">
                {t("fee")} {(row.original.feeCents / 100).toFixed(2)}
              </span>
            )}
          </span>
        ),
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ getValue }) => <Badge variant="secondary">{getValue()}</Badge>,
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
      sortable={["createdAt", "amountCents"]}
      searchPlaceholder={t("search")}
      filters={[{ key: "status", label: t("colStatus"), options: statuses.map((s) => ({ value: s, label: s })) }]}
      empty={{ icon: CreditCard, title: t("empty"), description: t("empty_hint") }}
    />
  )
}
