"use client"

import { Mail } from "lucide-react"
import Link from "next/link"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo, type ComponentProps } from "react"
import type { TableQuery } from "@/lib/table-query"
import type { EmailStatus } from "@/lib/job-status"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import { Badge } from "@/components/ui/badge"

export type EmailRow = {
  id: string
  kind: string
  toAddress: string
  subject: string
  status: EmailStatus
  provider: string
  tenantSlug: string | null
  createdAt: string
}

const VARIANTS = {
  QUEUED: "outline",
  SENT: "secondary",
  REFUSED: "secondary",
  FAILED: "destructive",
} as const satisfies Record<EmailStatus, ComponentProps<typeof Badge>["variant"]>

type Props = {
  rows: EmailRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  kinds: string[]
  tenants: string[]
}

export function EmailsTable({ rows, total, query, defaults, kinds, tenants }: Props) {
  const t = useTranslations("platform.emails")
  const format = useFormatter()

  const columns = useMemo(() => {
    const col = dataTableColumns<EmailRow>()
    return col.columns([
      col.accessor("toAddress", {
        header: t("colTo"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/platform/emails/${row.original.id}`}
              className="block truncate font-medium text-foreground hover:underline"
            >
              {row.original.toAddress}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{row.original.subject}</p>
          </div>
        ),
      }),
      col.accessor("kind", {
        header: t("colKind"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.kind}</span>,
      }),
      col.accessor("status", {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => <Badge variant={VARIANTS[row.original.status]}>{t(`status.${row.original.status}`)}</Badge>,
      }),
      col.accessor("provider", {
        header: t("colProvider"),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.provider}</span>,
      }),
      col.accessor("tenantSlug", {
        header: t("colTenant"),
        cell: ({ row }) =>
          row.original.tenantSlug ? (
            <Link
              href={`/platform/tenants/${row.original.tenantSlug}`}
              className="font-mono text-xs text-muted-foreground hover:underline"
            >
              {row.original.tenantSlug}
            </Link>
          ) : (
            "—"
          ),
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("colCreatedAt"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), "dateTime")}
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
      defaults={defaults}
      getRowId={(row) => row.id}
      sortable={["createdAt", "toAddress", "kind"]}
      searchPlaceholder={t("search")}
      filters={[
        { key: "status", label: t("colStatus"), options: statusOptions(t) },
        { key: "kind", label: t("colKind"), options: kinds.map((k) => ({ value: k, label: k })) },
        { key: "tenant", label: t("colTenant"), options: tenants.map((s) => ({ value: s, label: s })) },
      ]}
      empty={{ icon: Mail, title: t("empty.title"), description: t("empty.description") }}
    />
  )
}

function statusOptions(t: ReturnType<typeof useTranslations>) {
  return (["QUEUED", "SENT", "REFUSED", "FAILED"] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))
}
