"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Plus, Trash2, UserSquare } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions } from "@/components/data-table/row-actions"
import { useDrawer } from "@/stores/drawer"
import { addStaff, removeStaff } from "@/app/actions/team"
import { staffSchema, type StaffInput } from "@/lib/schemas/tenant"
import type { TableQuery } from "@/lib/table-query"

const ADD = "staff-add"

export type StaffRow = { id: string; name: string; bio: string | null; isSample: boolean }

/** The team list (task 4.3, member-parity): staff in a DataTable, add opens a
 * FormDrawer — the same shape members and catalog use. */
export function StaffTable({
  heading,
  rows,
  total,
  query,
  canManage,
}: {
  heading?: TableHeading
  rows: StaffRow[]
  total: number
  query: TableQuery
  canManage: boolean
}) {
  const t = useTranslations("dashboard.team")
  const openDrawer = useDrawer((s) => s.open)

  const columns = useMemo(() => {
    const col = dataTableColumns<StaffRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium">
              {row.original.name}
              {row.original.isSample ? (
                <Badge variant="outline" className="ml-2">
                  {t("sample")}
                </Badge>
              ) : null}
            </p>
            {row.original.bio && <p className="truncate text-sm text-muted-foreground">{row.original.bio}</p>}
          </div>
        ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) =>
          canManage ? (
            <RowActions
              label={row.original.name}
              actions={[
                {
                  label: t("actions.remove"),
                  icon: Trash2,
                  confirm: {
                    title: t("removeConfirm.title"),
                    description: t("removeConfirm.description"),
                    confirmLabel: t("actions.remove"),
                  },
                  run: () => removeStaff(row.original.id),
                },
              ]}
            />
          ) : null,
      }),
    ])
  }, [t, canManage])

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
          icon: UserSquare,
          title: t("empty"),
          description: t("empty_hint"),
          action: canManage ? (
            <Button onClick={() => openDrawer(ADD)}>
              <Plus />
              {t("actions.add")}
            </Button>
          ) : undefined,
        }}
        actions={
          canManage ? (
            <Button onClick={() => openDrawer(ADD)}>
              <Plus className="h-4 w-4" />
              {t("actions.add")}
            </Button>
          ) : null
        }
      />
      {canManage && <StaffDrawer />}
    </>
  )
}

function StaffDrawer() {
  const t = useTranslations("dashboard.team")
  const te = useTranslations("dashboard.team.errors")
  const open = useDrawer((s) => s.kind === ADD)
  const form = useForm<StaffInput>({
    resolver: zodResolver(staffSchema({ nameRequired: te("nameRequired") })),
    defaultValues: { name: "", bio: "" },
  })
  if (!open) return null
  return (
    <FormDrawer
      kind={ADD}
      title={t("actions.add")}
      description={t("addHint")}
      form={form}
      onSubmit={addStaff}
      size="sm"
    >
      <div className="grid gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("staffName")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("staffBio")}</FormLabel>
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
