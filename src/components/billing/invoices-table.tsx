"use client"

import { ExternalLink, FileDown, Receipt } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import { RowActions, type RowAction } from "@/components/data-table/row-actions"
import type { TableQuery } from "@/lib/table-query"
import { StatusBadge, type StatusMap } from "@/components/data-table/status-badge"
import { CircleAlert, CircleCheck, CircleDashed, CircleX, Clock } from "lucide-react"

export const INVOICE_STATUSES = ["draft", "open", "paid", "uncollectible", "void"] as const

type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

const INVOICE_TONES: StatusMap<InvoiceStatus> = {
  draft: { tone: "muted", icon: CircleDashed },
  open: { tone: "info", icon: Clock },
  paid: { tone: "success", icon: CircleCheck },
  uncollectible: { tone: "danger", icon: CircleAlert },
  void: { tone: "muted", icon: CircleX },
}

export type InvoiceRow = {
  id: string
  created: string
  total: number
  currency: string | null
  status: string | null
  hostedUrl: string | null
  pdfUrl: string | null
}

/** Billing → Invoices, read from Stripe: paged and filtered by status, links in the row menu. */
export function InvoicesTable({
  rows,
  total,
  query,
  defaults,
  emptyDescription,
}: {
  rows: InvoiceRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  emptyDescription: string
}) {
  const t = useTranslations("dashboard.billing")
  const format = useFormatter()

  const columns = useMemo(() => {
    const col = dataTableColumns<InvoiceRow>()
    return col.columns([
      col.accessor("created", {
        id: "created",
        header: t("colDate"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{format.dateTime(new Date(row.original.created), "date")}</span>
        ),
      }),
      col.accessor("total", {
        header: t("colAmount"),
        // The invoice total in its own currency: the total, not what has been
        // paid so far, which reads as zero on an open one.
        cell: ({ row }) =>
          format.number(row.original.total / 100, {
            style: "currency",
            currency: (row.original.currency ?? "usd").toUpperCase(),
          }),
      }),
      col.accessor("status", {
        header: t("colStatus"),
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <StatusBadge
              {...(status && status in INVOICE_TONES
                ? INVOICE_TONES[status as InvoiceStatus]
                : { tone: "neutral" as const })}
            >
              {status && (INVOICE_STATUSES as readonly string[]).includes(status)
                ? t(`invoiceStatus.${status}`)
                : (status ?? t("statusUnknown"))}
            </StatusBadge>
          )
        },
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colInvoice")}</span>,
        cell: ({ row }) => {
          const actions: RowAction[] = []
          const { hostedUrl, pdfUrl } = row.original
          if (hostedUrl)
            actions.push({
              label: t("viewInvoice"),
              icon: ExternalLink,
              onSelect: () => window.open(hostedUrl, "_blank", "noopener"),
            })
          if (pdfUrl)
            actions.push({
              label: t("downloadPdf"),
              icon: FileDown,
              onSelect: () => window.open(pdfUrl, "_blank", "noopener"),
            })
          return <RowActions label={format.dateTime(new Date(row.original.created), "date")} actions={actions} />
        },
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
      sortable={["created"]}
      filters={[
        {
          key: "status",
          label: t("colStatus"),
          options: INVOICE_STATUSES.map((s) => ({ value: s, label: t(`invoiceStatus.${s}`) })),
        },
      ]}
      empty={{ icon: Receipt, title: t("noInvoicesTitle"), description: emptyDescription }}
    />
  )
}
