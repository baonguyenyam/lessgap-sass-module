"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Hourglass } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { WaitlistActions } from "@/components/booking/waitlist-actions"
import type { TableQuery } from "@/lib/table-query"

export type WaitlistRow = { id: string; wantedDate: string; contact: string; status: string }

export function WaitlistTable({
  heading,
  rows,
  total,
  query,
  statuses,
}: {
  heading?: TableHeading
  rows: WaitlistRow[]
  total: number
  query: TableQuery
  statuses: string[]
}) {
  const t = useTranslations("dashboard.waitlist")
  const columns = useMemo(() => {
    const col = dataTableColumns<WaitlistRow>()
    return col.columns([
      col.accessor("wantedDate", {
        header: t("colDate"),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      col.accessor("contact", {
        header: t("colContact"),
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || "—"}</span>,
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ getValue }) => <Badge variant="outline">{t(`status.${getValue()}`)}</Badge>,
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => <WaitlistActions entryId={row.original.id} status={row.original.status} />,
      }),
    ])
  }, [t])

  return (
    <DataTable
      heading={heading}
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={{ sort: "wantedDate", dir: "asc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["wantedDate"]}
      searchPlaceholder={t("search")}
      filters={[
        { key: "status", label: t("colStatus"), options: statuses.map((s) => ({ value: s, label: t(`status.${s}`) })) },
      ]}
      empty={{ icon: Hourglass, title: t("none"), description: t("none_hint") }}
    />
  )
}
