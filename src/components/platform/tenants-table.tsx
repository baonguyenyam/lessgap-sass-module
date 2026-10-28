"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Plus } from "lucide-react"
import Link from "next/link"
import { useFormatter, useTranslations } from "next-intl"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { createTenantFor } from "@/app/actions/platform-tenants"
import { createTenantSchema, type CreateTenantInput } from "@/lib/schemas/platform"
import type { TableQuery } from "@/lib/table-query"
import type { TenantStatus } from "@/lib/tenant-status"
import { useDrawer } from "@/stores/drawer"
import { DataTable, dataTableColumns } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { TenantStatusBadge } from "@/components/platform/tenant-status-badge"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export type TenantRow = {
  id: string
  name: string
  slug: string
  status: TenantStatus
  members: number
  createdAt: string
}

const CREATE = "tenant-create"

const STATUS_OPTIONS: TenantStatus[] = ["PROVISIONING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"]

type Props = {
  rows: TenantRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
}

export function TenantsTable({ rows, total, query, defaults }: Props) {
  const t = useTranslations("platform.tenants")
  const format = useFormatter()
  const openDrawer = useDrawer((s) => s.open)

  const columns = useMemo(() => {
    const col = dataTableColumns<TenantRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colTenant"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/platform/tenants/${row.original.slug}`}
              className="block truncate font-medium text-foreground hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="truncate font-mono text-xs text-muted-foreground">{row.original.slug}</p>
          </div>
        ),
      }),
      col.accessor("status", {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => <TenantStatusBadge status={row.original.status} />,
      }),
      col.accessor("members", {
        header: t("colMembers"),
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.members}</span>,
      }),
      col.accessor("createdAt", {
        id: "createdAt",
        header: t("colCreated"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.dateTime(new Date(row.original.createdAt), "date")}
          </span>
        ),
      }),
    ])
  }, [t, format])

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        query={query}
        defaults={defaults}
        getRowId={(row) => row.id}
        sortable={["name", "slug", "createdAt"]}
        searchPlaceholder={t("search")}
        filters={[
          {
            key: "status",
            label: t("colStatus"),
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: t(`status.${s}`) })),
          },
        ]}
        empty={{
          icon: Building2,
          title: t("empty.title"),
          description: t("empty.description"),
          action: (
            <Button onClick={() => openDrawer(CREATE)}>
              <Plus />
              {t("create.title")}
            </Button>
          ),
        }}
        actions={
          <Button onClick={() => openDrawer(CREATE)}>
            <Plus className="h-4 w-4" />
            {t("create.title")}
          </Button>
        }
      />
      <CreateDrawer />
    </>
  )
}

function CreateDrawer() {
  const t = useTranslations("platform.tenants")
  const te = useTranslations("platform.tenants.errors")
  const open = useDrawer((s) => s.kind === CREATE)
  const form = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema({ nameRequired: te("nameRequired"), invalidEmail: te("invalidEmail") })),
    defaultValues: { name: "", ownerEmail: "" },
  })
  if (!open) return null

  return (
    <FormDrawer
      kind={CREATE}
      title={t("create.title")}
      description={t("create.description")}
      form={form}
      onSubmit={createTenantFor}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("create.name")}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={t("create.namePlaceholder")} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ownerEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("create.ownerEmail")}</FormLabel>
            <FormControl>
              <Input {...field} type="email" placeholder={t("create.ownerEmailPlaceholder")} autoComplete="off" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}
