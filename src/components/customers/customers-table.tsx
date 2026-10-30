"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Users } from "lucide-react"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { CustomerActions } from "@/components/customers/customer-actions"
import type { TableQuery } from "@/lib/table-query"

export type CustomerRow = {
  id: string
  name: string
  contact: string
  marketing: boolean
  sms: boolean
}

/** The customers list (member-parity): everyone who booked, in a DataTable —
 * read-only, bookings and orders on the site create them. */
export function CustomersTable({
  heading,
  rows,
  total,
  query,
}: {
  heading?: TableHeading
  rows: CustomerRow[]
  total: number
  query: TableQuery
}) {
  const t = useTranslations("dashboard.customers")
  const columns = useMemo(() => {
    const col = dataTableColumns<CustomerRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      col.accessor("contact", {
        header: t("colContact"),
        cell: ({ getValue, row }) => (
          <span className="text-muted-foreground">
            {getValue() || t("no_contact")}
            {[row.original.marketing && t("consent_marketing"), row.original.sms && t("consent_sms")]
              .filter(Boolean)
              .join(" · ") && (
              <span className="block text-xs">
                {[row.original.marketing && t("consent_marketing"), row.original.sms && t("consent_sms")]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => <CustomerActions customerId={row.original.id} name={row.original.name} />,
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
      defaults={{ sort: "name", dir: "asc", pageSize: 10 }}
      getRowId={(row) => row.id}
      sortable={["name"]}
      searchPlaceholder={t("search")}
      empty={{ icon: Users, title: t("empty"), description: t("empty_hint") }}
    />
  )
}
