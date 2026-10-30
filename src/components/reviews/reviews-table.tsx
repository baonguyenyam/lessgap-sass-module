"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { ReviewActions } from "@/components/booking/review-actions"
import type { TableQuery } from "@/lib/table-query"

export type ReviewRow = {
  id: string
  rating: number
  customerName: string | null
  body: string | null
  status: string
}

export function ReviewsTable({ rows, total, query }: { rows: ReviewRow[]; total: number; query: TableQuery }) {
  const t = useTranslations("dashboard.reviews")
  const columns = useMemo(() => {
    const col = dataTableColumns<ReviewRow>()
    return col.columns([
      col.accessor("rating", { header: t("colRating"), cell: ({ getValue }) => "★".repeat(getValue()) }),
      col.accessor("customerName", {
        header: t("colCustomer"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium">{row.original.customerName ?? "—"}</p>
            {row.original.body && (
              <p className="truncate text-sm text-muted-foreground">&ldquo;{row.original.body}&rdquo;</p>
            )}
          </div>
        ),
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ getValue }) => <Badge variant="outline">{t(getValue())}</Badge>,
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => (row.original.status === "pending" ? <ReviewActions id={row.original.id} /> : null),
      }),
    ])
  }, [t])

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={{ sort: "rating", dir: "desc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["rating"]}
      searchPlaceholder={t("search")}
      filters={[
        {
          key: "status",
          label: t("colStatus"),
          options: ["pending", "published", "rejected"].map((s) => ({ value: s, label: t(s) })),
        },
      ]}
      empty={{ icon: Star, title: t("none_pending"), description: t("none_pending_hint") }}
    />
  )
}
