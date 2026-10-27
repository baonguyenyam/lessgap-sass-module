"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { deleteTenantRoles, saveTenantRole } from "@/app/actions/roles"
import { DataTable, dataTableColumns, type BulkAction } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions, type RowAction } from "@/components/data-table/row-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { tenantRoleSchema, type TenantRoleInput } from "@/lib/schemas/tenant"
import type { TableQuery } from "@/lib/table-query"
import { useDrawer } from "@/stores/drawer"

export type RoleRow = { id: string; role: string; builtIn: boolean; permissions: string[]; members: number }
type Catalog = Record<string, string[]>

const DRAWER = "tenant-role"

export function RolesTable({
  rows,
  total,
  query,
  defaults,
  catalog,
  canManage,
}: {
  rows: RoleRow[]
  total: number
  query: TableQuery
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  catalog: Catalog
  canManage: boolean
}) {
  const t = useTranslations("dashboard.roles")
  const openDrawer = useDrawer((s) => s.open)
  const deleteConfirm = {
    title: t("deleteConfirm.title"),
    description: t("deleteConfirm.description"),
    confirmLabel: t("custom.delete"),
  }

  const columns = useMemo(() => {
    const col = dataTableColumns<RoleRow>()
    return col.columns([
      col.accessor("role", {
        id: "role",
        header: t("colRole"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.original.builtIn ? "default" : "outline"}>{row.original.role}</Badge>
            {row.original.builtIn && (
              <span className="text-xs whitespace-nowrap text-muted-foreground">{t("builtInTag")}</span>
            )}
          </div>
        ),
      }),
      col.accessor("permissions", {
        header: t("colPermissions"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-md text-xs text-muted-foreground">
            {row.original.permissions.join(", ")}
          </span>
        ),
      }),
      col.accessor("members", {
        id: "members",
        header: t("colMembers"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.members}</span>,
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("colActions")}</span>,
        cell: ({ row }) => {
          const role = row.original
          if (!canManage || role.builtIn) return null
          const actions: RowAction[] = [
            { label: t("edit"), icon: Pencil, onSelect: () => openDrawer(DRAWER, role.role) },
          ]
          if (role.members === 0) {
            actions.push({
              label: t("custom.delete"),
              icon: Trash2,
              variant: "destructive",
              confirm: deleteConfirm,
              run: () => deleteTenantRoles([role.role]),
            })
          }
          return <RowActions label={role.role} actions={actions} />
        },
      }),
    ])
  }, [t, canManage, openDrawer]) // eslint-disable-line react-hooks/exhaustive-deps

  const bulkActions: BulkAction[] = canManage
    ? [
        {
          label: t("custom.delete"),
          icon: Trash2,
          variant: "destructive",
          confirm: deleteConfirm,
          run: (ids) => deleteTenantRoles(ids),
        },
      ]
    : []

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        query={query}
        defaults={defaults}
        getRowId={(row) => row.id}
        sortable={["role", "members"]}
        searchPlaceholder={t("search")}
        filters={[
          {
            key: "kind",
            label: t("kind.label"),
            options: [
              { value: "builtIn", label: t("kind.builtIn") },
              { value: "custom", label: t("kind.custom") },
            ],
          },
        ]}
        bulkActions={bulkActions}
        empty={{ icon: KeyRound, title: t("empty.title"), description: t("empty.description") }}
        actions={
          canManage ? (
            <Button onClick={() => openDrawer(DRAWER)}>
              <Plus className="h-4 w-4" />
              {t("create.title")}
            </Button>
          ) : null
        }
      />
      {canManage && <RoleDrawer rows={rows} catalog={catalog} />}
    </>
  )
}

function RoleDrawer({ rows, catalog }: { rows: RoleRow[]; catalog: Catalog }) {
  const kind = useDrawer((s) => s.kind)
  const id = useDrawer((s) => s.id)
  if (kind !== DRAWER) return null
  const role = id ? rows.find((r) => r.id === id && !r.builtIn) : null
  return <RoleForm key={id ?? "new"} role={role ?? null} catalog={catalog} />
}

function RoleForm({ role, catalog }: { role: RoleRow | null; catalog: Catalog }) {
  const t = useTranslations("dashboard.roles")
  const te = useTranslations("dashboard.roles.errors")
  const form = useForm<TenantRoleInput>({
    resolver: zodResolver(tenantRoleSchema({ roleKey: te("roleKey"), permissionsRequired: te("permissionsRequired") })),
    defaultValues: { role: role?.role ?? "", permissions: role?.permissions ?? [] },
  })

  return (
    <FormDrawer
      kind={DRAWER}
      title={role ? t("editTitle") : t("create.title")}
      description={role ? role.role : t("create.description")}
      size="xl"
      form={form}
      onSubmit={(values) => saveTenantRole(role?.role ?? null, values)}
    >
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("create.name")}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={t("create.namePlaceholder")} disabled={role !== null} autoComplete="off" />
            </FormControl>
            <FormDescription>{t("create.nameHint")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="permissions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("colPermissions")}</FormLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(catalog).map(([resource, verbs]) => (
                <fieldset key={resource} className="rounded-lg border border-border p-3">
                  <legend className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {resource}
                  </legend>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {verbs.map((verb) => {
                      const key = `${resource}.${verb}`
                      const checked = field.value.includes(key)
                      return (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              field.onChange(
                                next === true ? [...field.value, key] : field.value.filter((k) => k !== key)
                              )
                            }
                          />
                          {verb}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}
