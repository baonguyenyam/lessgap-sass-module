"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { DataTable, dataTableColumns, type TableHeading } from "@/components/data-table/data-table"
import { FormDrawer } from "@/components/data-table/form-drawer"
import { RowActions } from "@/components/data-table/row-actions"
import { OptionSelect } from "@/components/form/option-select"
import { useDrawer } from "@/stores/drawer"
import { addCategory, addService, deleteService } from "@/app/actions/catalog"
import {
  catalogCategorySchema,
  catalogServiceSchema,
  type CatalogCategoryInput,
  type CatalogServiceInput,
} from "@/lib/schemas/tenant"
import type { TableQuery } from "@/lib/table-query"
import { List } from "lucide-react"

const SERVICE = "catalog-service"
const CATEGORY = "catalog-category"

export type ServiceRow = {
  id: string
  name: string
  category: string | null
  durationMinutes: number
  priceCents: number
  currency: string
  isSample: boolean
}

/** The catalog list (task 4.2, member-parity): services in a DataTable with a
 * category facet; add service / add category open FormDrawers — the same
 * shape the members page uses. */
export function ServicesTable({
  heading,
  rows,
  total,
  query,
  categories,
  canManage,
}: {
  heading?: TableHeading
  rows: ServiceRow[]
  total: number
  query: TableQuery
  categories: { id: string; name: string }[]
  canManage: boolean
}) {
  const t = useTranslations("dashboard.catalog")
  const openDrawer = useDrawer((s) => s.open)
  const columns = useMemo(() => {
    const col = dataTableColumns<ServiceRow>()
    return col.columns([
      col.accessor("name", {
        header: t("colName"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name}
            {row.original.isSample ? (
              <Badge variant="outline" className="ml-2">
                {t("sample")}
              </Badge>
            ) : null}
          </span>
        ),
      }),
      col.accessor("category", {
        header: t("category"),
        cell: ({ getValue }) => getValue() ?? t("uncategorized"),
      }),
      col.accessor("durationMinutes", {
        header: t("colDuration"),
        cell: ({ getValue }) => `${getValue()} min`,
      }),
      col.accessor("priceCents", {
        header: () => <span className="block text-right">{t("colPrice")}</span>,
        cell: ({ row }) => (
          <span className="block text-right">
            {(row.original.priceCents / 100).toFixed(0)} {row.original.currency.toUpperCase()}
          </span>
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
                  run: () => deleteService(row.original.id),
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
        sortable={["name", "priceCents", "durationMinutes"]}
        searchPlaceholder={t("search")}
        filters={[
          {
            key: "category",
            label: t("category"),
            options: categories.map((c) => ({ value: c.name, label: c.name })),
          },
        ]}
        empty={{
          icon: List,
          title: t("empty"),
          description: t("empty_hint"),
          action: canManage ? (
            <Button onClick={() => openDrawer(SERVICE)}>
              <Plus />
              {t("actions.add")}
            </Button>
          ) : undefined,
        }}
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={() => openDrawer(CATEGORY)}>
                <Plus className="h-4 w-4" />
                {t("actions.addCategory")}
              </Button>
              <Button onClick={() => openDrawer(SERVICE)}>
                <Plus className="h-4 w-4" />
                {t("actions.add")}
              </Button>
            </>
          ) : null
        }
      />
      {canManage && <CategoryDrawer />}
      {canManage && <ServiceDrawer categories={categories} />}
    </>
  )
}

function CategoryDrawer() {
  const t = useTranslations("dashboard.catalog")
  const te = useTranslations("dashboard.catalog.errors")
  const open = useDrawer((s) => s.kind === CATEGORY)
  const form = useForm<CatalogCategoryInput>({
    resolver: zodResolver(
      catalogCategorySchema({
        nameRequired: te("nameRequired"),
        durationInvalid: "",
        priceInvalid: "",
      })
    ),
    defaultValues: { name: "" },
  })
  if (!open) return null
  return (
    <FormDrawer
      kind={CATEGORY}
      title={t("actions.addCategory")}
      description={t("addCategoryHint")}
      form={form}
      onSubmit={addCategory}
      size="sm"
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("categoryName")}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDrawer>
  )
}

function ServiceDrawer({ categories }: { categories: { id: string; name: string }[] }) {
  const t = useTranslations("dashboard.catalog")
  const te = useTranslations("dashboard.catalog.errors")
  const open = useDrawer((s) => s.kind === SERVICE)
  const form = useForm<CatalogServiceInput>({
    resolver: zodResolver(
      catalogServiceSchema({
        nameRequired: te("nameRequired"),
        durationInvalid: te("durationInvalid"),
        priceInvalid: te("priceInvalid"),
      })
    ),
    defaultValues: { name: "", durationMinutes: 60, price: 0, categoryId: "" },
  })
  if (!open) return null
  return (
    <FormDrawer
      kind={SERVICE}
      title={t("actions.add")}
      description={t("addServiceHint")}
      form={form}
      onSubmit={(v) =>
        addService({
          name: v.name,
          durationMinutes: v.durationMinutes,
          priceCents: Math.round(v.price * 100),
          categoryId: v.categoryId || undefined,
        })
      }
    >
      <div className="grid gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serviceName")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("duration")}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("price")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    step="0.01"
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {categories.length > 0 && (
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("category")}</FormLabel>
                <FormControl>
                  <OptionSelect
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder={t("category")}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </FormDrawer>
  )
}
