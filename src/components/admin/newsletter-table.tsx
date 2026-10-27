"use client"

import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { toast } from "sonner"
import { unsubscribeSubscribers } from "@/app/actions/newsletter-admin"
import { DataTable, dataTableColumns, type BulkAction } from "@/components/data-table/data-table"
import { RowActions } from "@/components/data-table/row-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TableQuery } from "@/lib/table-query"

export const NEWSLETTER_STATUSES = ["pending", "confirmed", "unsubscribed"] as const
type Status = (typeof NEWSLETTER_STATUSES)[number]

export type SubscriberRow = { id: string; email: string; source: string; createdAt: string; status: Status }

const STATUS_VARIANT = { pending: "secondary", confirmed: "success", unsubscribed: "outline" } as const

export function NewsletterTable({
  rows,
  total,
  query,
  defaults,
}: {
  rows: SubscriberRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
}) {
  const t = useTranslations("admin.newsletter")
  const format = useFormatter()

  const unsubscribeConfirm = {
    title: t("unsubscribeConfirm.title"),
    description: t("unsubscribeConfirm.description"),
    confirmLabel: t("unsubscribe"),
  }

  const columns = useMemo(() => {
    const col = dataTableColumns<SubscriberRow>()
    return col.columns([
      col.accessor("email", {
        header: t("colEmail"),
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.email}</span>,
      }),
      col.accessor("source", {
        header: t("colSource"),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.source}</span>,
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{t(`status.${row.original.status}`)}</Badge>,
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("colRequested"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">{format.dateTime(new Date(row.original.createdAt), "date")}</span>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => {
          const sub = row.original
          return (
            <RowActions
              label={sub.email}
              actions={[
                {
                  label: t("copyEmail"),
                  onSelect: () => navigator.clipboard.writeText(sub.email).then(() => toast.success(t("copied"))),
                },
                ...(sub.status === "unsubscribed"
                  ? []
                  : [
                      {
                        label: t("unsubscribe"),
                        variant: "destructive" as const,
                        confirm: unsubscribeConfirm,
                        run: () => unsubscribeSubscribers([sub.id]),
                      },
                    ]),
              ]}
            />
          )
        },
      }),
    ])
  }, [t, format]) // eslint-disable-line react-hooks/exhaustive-deps

  const bulkActions: BulkAction[] = [
    { label: t("exportSelected"), run: async (ids) => downloadCsv(rows.filter((r) => ids.includes(r.id))) },
    { label: t("unsubscribe"), variant: "destructive", confirm: unsubscribeConfirm, run: (ids) => unsubscribeSubscribers(ids) },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={defaults}
      getRowId={(row) => row.id}
      sortable={["email", "createdAt"]}
      searchPlaceholder={t("search")}
      filters={[{ key: "status", label: t("colStatus"), options: NEWSLETTER_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) }]}
      bulkActions={bulkActions}
      emptyMessage={t("empty")}
      actions={
        <Button asChild variant="outline" size="sm">
          {/* A file download from a route handler, not a page: `next/link`
              would prefetch it, and the rule cannot tell the two apart. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/admin/newsletter-export">{t("exportAll")}</a>
        </Button>
      }
    />
  )
}

function downloadCsv(rows: SubscriberRow[]) {
  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = ["email,source,status,requested_at", ...rows.map((r) => [r.email, r.source, r.status, r.createdAt].map(esc).join(","))]
  const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" }))
  Object.assign(document.createElement("a"), { href: url, download: "newsletter-selected.csv" }).click()
  URL.revokeObjectURL(url)
}
