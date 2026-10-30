"use client"

import { Copy, Download, Mail, MailX } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo, type ReactNode } from "react"
import { toast } from "sonner"
import { unsubscribeSubscribers } from "@/app/actions/newsletter-admin"
import { DataTable, dataTableColumns, type BulkAction, type TableHeading } from "@/components/data-table/data-table"
import { RowActions } from "@/components/data-table/row-actions"
import { Button } from "@/components/ui/button"
import type { TableQuery } from "@/lib/table-query"
import { StatusBadge, type StatusMap } from "@/components/data-table/status-badge"
import { CircleCheck, CircleMinus, Clock } from "lucide-react"

export const NEWSLETTER_STATUSES = ["pending", "confirmed", "unsubscribed"] as const
type Status = (typeof NEWSLETTER_STATUSES)[number]

export type SubscriberRow = { id: string; email: string; source: string; createdAt: string; status: Status }

const STATUSES = {
  pending: { tone: "warning", icon: Clock },
  confirmed: { tone: "success", icon: CircleCheck },
  unsubscribed: { tone: "muted", icon: CircleMinus },
} as const satisfies StatusMap<"pending" | "confirmed" | "unsubscribed">

export function NewsletterTable({
  heading,
  rows,
  total,
  query,
  defaults,
  unsubscribe = unsubscribeSubscribers,
  exportHref = "/api/admin/newsletter-export",
  canManage = true,
  toolbar,
}: { heading?: TableHeading } & {
  rows: SubscriberRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  /** Defaults to the platform list; a workspace passes its own. */
  unsubscribe?: (ids: string[]) => Promise<unknown>
  exportHref?: string
  canManage?: boolean
  toolbar?: ReactNode
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
        cell: ({ row }) => (
          <StatusBadge {...STATUSES[row.original.status]}>{t(`status.${row.original.status}`)}</StatusBadge>
        ),
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("colRequested"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), "date")}
          </span>
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
                  icon: Copy,
                  onSelect: () => navigator.clipboard.writeText(sub.email).then(() => toast.success(t("copied"))),
                },
                ...(sub.status === "unsubscribed" || !canManage
                  ? []
                  : [
                      {
                        label: t("unsubscribe"),
                        icon: MailX,
                        variant: "destructive" as const,
                        confirm: unsubscribeConfirm,
                        run: () => unsubscribe([sub.id]),
                      },
                    ]),
              ]}
            />
          )
        },
      }),
    ])
  }, [t, format, canManage, unsubscribe]) // eslint-disable-line react-hooks/exhaustive-deps

  const bulkActions: BulkAction[] = [
    {
      label: t("exportSelected"),
      icon: Download,
      run: async (ids) => downloadCsv(rows.filter((r) => ids.includes(r.id))),
    },
    ...(canManage
      ? [
          {
            label: t("unsubscribe"),
            icon: MailX,
            variant: "destructive" as const,
            confirm: unsubscribeConfirm,
            run: (ids: string[]) => unsubscribe(ids),
          },
        ]
      : []),
  ]

  return (
    <DataTable
      heading={heading}
      columns={columns}
      data={rows}
      total={total}
      query={query}
      defaults={defaults}
      getRowId={(row) => row.id}
      sortable={["email", "createdAt"]}
      searchPlaceholder={t("search")}
      filters={[
        {
          key: "status",
          label: t("colStatus"),
          options: NEWSLETTER_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
        },
      ]}
      bulkActions={bulkActions}
      empty={{ icon: Mail, title: t("empty.title"), description: t("empty.description") }}
      actions={
        <>
          {toolbar}
          <Button asChild variant="outline">
            {/* A file download from a route handler, not a page: `next/link`
              would prefetch it, and the rule cannot tell the two apart. */}
            {}
            <a href={exportHref}>
              <Download />
              {t("exportAll")}
            </a>
          </Button>
        </>
      }
    />
  )
}

function downloadCsv(rows: SubscriberRow[]) {
  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [
    "email,source,status,requested_at",
    ...rows.map((r) => [r.email, r.source, r.status, r.createdAt].map(esc).join(",")),
  ]
  const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" }))
  Object.assign(document.createElement("a"), { href: url, download: "newsletter-selected.csv" }).click()
  URL.revokeObjectURL(url)
}
