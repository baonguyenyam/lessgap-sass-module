"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { MapPin, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { useDrawer } from "@/stores/drawer"
import { createLocation } from "@/app/actions/locations"
import { locationSchema, type LocationInput } from "@/lib/schemas/tenant"
import type { TableQuery } from "@/lib/table-query"

const ADD = "location-add"

export type LocationRow = { id: string; name: string; address: string | null }

/** The locations list (task 16.2, member-parity): a DataTable, add opens a
 * FormDrawer — the same shape members and catalog use. */
export function LocationsTable({
  heading,
  rows,
  total,
  query,
  canManage,
}: {
  heading?: TableHeading
  rows: LocationRow[]
  total: number
  query: TableQuery
  canManage: boolean
}) {
  const t = useTranslations("dashboard.locations")
  const openDrawer = useDrawer((s) => s.open)

  const columns = useMemo(() => {
    const col = dataTableColumns<LocationRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      col.accessor("address", {
        header: t("address"),
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() ?? "—"}</span>,
      }),
    ])
  }, [t])

  return (
    <>
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
        empty={{
          icon: MapPin,
          title: t("none"),
          description: t("none_hint"),
          action: canManage ? (
            <Button onClick={() => openDrawer(ADD)}>
              <Plus />
              {t("add")}
            </Button>
          ) : undefined,
        }}
        actions={
          canManage ? (
            <Button onClick={() => openDrawer(ADD)}>
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          ) : null
        }
      />
      {canManage && <LocationDrawer />}
    </>
  )
}

function LocationDrawer() {
  const t = useTranslations("dashboard.locations")
  const te = useTranslations("dashboard.locations.errors")
  const open = useDrawer((s) => s.kind === ADD)
  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema({ nameRequired: te("nameRequired") })),
    defaultValues: { name: "", address: "" },
  })
  if (!open) return null
  return (
    <FormDrawer kind={ADD} title={t("add")} description={t("addHint")} form={form} onSubmit={createLocation} size="sm">
      <div className="grid gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("address")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDrawer>
  )
}
