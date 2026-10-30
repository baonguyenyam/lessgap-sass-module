"use client"

import type { Route } from "next"
import { useMutation } from "@tanstack/react-query"
import {
  columnVisibilityFeature,
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SearchX,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FacetFilter, type FacetOption } from "@/components/data-table/facet-filter"
import { PageHeader } from "@/components/layout/page-header"
import { pageItems } from "@/lib/pagination"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { OptionSelect } from "@/components/form/option-select"
import { EmptyState, type EmptyTone } from "@/components/layout/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog, type ConfirmCopy } from "@/components/data-table/confirm-dialog"
import { PAGE_SIZES, pageCountOf, tableQueryHref, type TableQuery, type TableQueryPatch } from "@/lib/table-query"
import { cn } from "@/lib/utils"

/**
 * Every list in the app (spec/adr/0020-application-stack.md). The server page parses the URL with
 * `parseTableQuery`, runs the query and passes one page of rows; this renders
 * them and turns every control into a new URL: search, filters, sort, page and
 * page size are links, so a list can be shared, bookmarked and reloaded.
 *
 * Columns are TanStack Table v9 definitions built with `dataTableColumns<T>()`.
 * Selection and which columns are shown are the only state the table owns;
 * bulk actions run through TanStack Query mutations and refresh the page when
 * they succeed.
 *
 * The layout is shadcn-admin's list (.agents/rules/ui-accessibility.md):
 * heading with its buttons on the right, a toolbar of search, facet pills and
 * "View", the table with a trailing "…" column or a right-aligned last
 * column, and a footer of rows per page, the floating bulk bar and the pager.
 */
export const dataTableFeatures = tableFeatures({ rowSelectionFeature, columnVisibilityFeature })
type Features = typeof dataTableFeatures

/** The column helper for a table of `TData` rows. */
export function dataTableColumns<TData extends RowData>() {
  return createColumnHelper<Features, TData>()
}

export type DataTableColumns<TData extends RowData> = ColumnDef<Features, TData, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any

export type DataTableFilter = { key: string; label: string; options: FacetOption[] }

/** A list page's title and description, drawn by the table with its buttons on the right. */
export type TableHeading = { title: string; description?: React.ReactNode }

export type BulkAction = {
  label: string
  icon: LucideIcon
  variant?: "destructive"
  /** Asked before running; the count of selected rows is passed as `{count}`. */
  confirm?: ConfirmCopy
  run: (ids: string[]) => Promise<unknown>
}

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumns<TData>
  data: TData[]
  total: number
  query: TableQuery
  /** The defaults the URL leaves out, the same ones the server parsed with. */
  defaults: { sort: string; dir: "asc" | "desc"; pageSize: number }
  getRowId: (row: TData) => string
  /** Column ids that can be sorted; each is also the `sort` key in the URL. */
  sortable?: string[]
  searchPlaceholder?: string
  filters?: DataTableFilter[]
  bulkActions?: BulkAction[]
  /**
   * The page's title and description: given, the table draws the heading with
   * `actions` on its right. Left out (a table inside a card), `actions` sit
   * at the right of the toolbar.
   */
  heading?: TableHeading
  /** The page's buttons, such as "Import" and the primary "Create", last. */
  actions?: React.ReactNode
  /**
   * What the list shows when it has no rows at all: one block in place of the
   * toolbar and the table. When a search or a filter is active the toolbar
   * stays and the block says "no results" instead, with a way to clear them,
   * so every list says it the same way. An empty list is never drawn as a table.
   */
  empty: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; tone?: EmptyTone }
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  total,
  query,
  defaults,
  getRowId,
  sortable = [],
  searchPlaceholder,
  filters = [],
  bulkActions = [],
  heading,
  actions,
  empty,
}: DataTableProps<TData>) {
  const t = useTranslations("dataTable")
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const selectable = bulkActions.length > 0

  // Stable inputs (TanStack Table v9): a new column array on every render
  // would rebuild the row models each time.
  const allColumns = useMemo(
    () => (selectable ? [selectionColumn as DataTableColumns<TData>[number], ...columns] : columns),
    [selectable, columns]
  )
  const table = useTable({
    features: dataTableFeatures,
    columns: allColumns,
    data,
    getRowId: (row) => getRowId(row),
    enableRowSelection: selectable,
  })
  const selectedIds = table.getSelectedRowIds()

  const go = (patch: TableQueryPatch) => {
    startTransition(() => router.push(tableQueryHref(pathname, query, patch, defaults) as Route, { scroll: false }))
  }

  // A new page of rows is a new list: what was selected on the last one is not
  // on screen. Only when the rows change, never on a plain re-render, or the
  // reset re-renders, which resets again.
  const shownData = useRef(data)
  useEffect(() => {
    if (shownData.current === data) return
    shownData.current = data
    table.resetRowSelection()
  }, [data, table])

  // Search runs a moment after typing stops, not on every key.
  const [search, setSearch] = useState(query.q)
  const lastSearch = useRef(query.q)
  useEffect(() => {
    if (search === lastSearch.current) return
    const timer = setTimeout(() => {
      lastSearch.current = search
      go({ q: search })
    }, 300)
    return () => clearTimeout(timer)
  })

  const [confirming, setConfirming] = useState<BulkAction | null>(null)
  const bulk = useMutation({
    mutationFn: ({ action, ids }: { action: BulkAction; ids: string[] }) => action.run(ids),
    onSuccess: () => {
      toast.success(t("done"))
      table.resetRowSelection()
      router.refresh()
    },
    onError: () => toast.error(t("failed")),
  })
  const runBulk = (action: BulkAction) => {
    if (action.confirm) setConfirming(action)
    else bulk.mutate({ action, ids: selectedIds })
  }

  // A search or a filter is narrowing the list: an empty page means "no
  // results", not "nothing here yet".
  const narrowed = query.q !== "" || Object.keys(query.filters).length > 0
  const clearFilters = () => {
    setSearch("")
    lastSearch.current = ""
    go({ q: "", filters: Object.fromEntries(Object.keys(query.filters).map((key) => [key, null])) })
  }

  const pages = pageCountOf(total, query.pageSize)

  const header = heading && <PageHeader title={heading.title} description={heading.description} actions={actions} />
  // The columns "View" can hide: data columns with a text header.
  const hideable = table
    .getAllLeafColumns()
    .filter(
      (column) => column.id !== "select" && column.id !== "actions" && typeof column.columnDef.header === "string"
    )
  const visible = table.getVisibleLeafColumns()
  const lastId = visible[visible.length - 1]?.id
  const alignOf = (id: string) =>
    cn(id === "select" && "w-10", id === lastId && "text-right", id === "actions" && "w-12")

  // Nothing at all yet: no toolbar, no table, only the block and its next step.
  if (data.length === 0 && !narrowed)
    return header ? (
      <div className="space-y-4">
        {header}
        <EmptyState {...empty} />
      </div>
    ) : (
      <EmptyState {...empty} />
    )

  return (
    <div className="space-y-4">
      {header}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {searchPlaceholder && (
          <div className="relative sm:w-72">
            {/* The search is a field waiting for data while the new rows load:
                the icon turns into a spinner until they arrive. */}
            {pending || search !== query.q ? (
              <Spinner className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            ) : (
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
            )}
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}
        {filters.map((filter) => (
          <FacetFilter
            key={filter.key}
            label={filter.label}
            options={filter.options}
            value={query.filters[filter.key]}
            onChange={(value) => go({ filters: { [filter.key]: value } })}
          />
        ))}
        {narrowed && (
          <Button variant="ghost" onClick={clearFilters}>
            {t("reset")}
            <X />
          </Button>
        )}
        <div className="flex gap-2 sm:ml-auto">
          {!heading && actions}
          {hideable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings2 />
                  {t("view")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>{t("toggleColumns")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideable.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value === true)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {String(column.columnDef.header)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("noResults.title")}
          description={t("noResults.description")}
          action={
            <Button variant="outline" onClick={clearFilters}>
              {t("noResults.clear")}
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={cn("rounded-[var(--radius)] border border-border transition-opacity", pending && "opacity-60")}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id}>
                    {group.headers.map((header) => {
                      const id = header.column.id
                      const canSort = sortable.includes(id)
                      const active = query.sort === id
                      return (
                        <TableHead
                          key={header.id}
                          aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : undefined}
                          className={alignOf(id)}
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              className="-ml-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
                              onClick={() => go({ sort: id, dir: active && query.dir === "asc" ? "desc" : "asc" })}
                            >
                              <table.FlexRender header={header} />
                              {active ? (
                                query.dir === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                              )}
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={alignOf(cell.column.id)}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* The footer: rows per page, the bulk bar while rows are selected
              (under the table, never above it), then the pager. */}
          <div className="flex flex-col gap-3 text-sm lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex items-center gap-2">
              <OptionSelect
                value={String(query.pageSize)}
                onValueChange={(value) => go({ pageSize: Number(value) })}
                options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                aria-label={t("rowsPerPage")}
                className="w-20"
              />
              <span className="font-medium whitespace-nowrap">{t("rowsPerPage")}</span>
            </div>

            <div className="flex justify-center">
              {selectable && selectedIds.length > 0 && (
                <div
                  role="toolbar"
                  aria-label={t("bulkActions")}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1.5"
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full"
                    aria-label={t("clearSelection")}
                    onClick={() => table.resetRowSelection()}
                  >
                    <X />
                  </Button>
                  <Separator orientation="vertical" className="h-5" />
                  <span className="flex items-center gap-1.5 px-1 whitespace-nowrap">
                    <Badge className="tabular-nums">{selectedIds.length}</Badge>
                    {t("selectedLabel", { count: selectedIds.length })}
                  </span>
                  <Separator orientation="vertical" className="h-5" />
                  {bulkActions.map((action) => {
                    const destructive = action.variant === "destructive"
                    return (
                      <Tooltip key={action.label}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={action.label}
                            className={cn(
                              "size-8",
                              destructive &&
                                "border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white"
                            )}
                            disabled={bulk.isPending}
                            onClick={() => runBulk(action)}
                          >
                            {bulk.isPending && bulk.variables?.action === action ? <Spinner /> : <action.icon />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{action.label}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              )}
            </div>

            <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3 lg:justify-end">
              <span className="font-medium whitespace-nowrap">{t("page", { page: query.page, pages })}</span>
              <div className="flex items-center gap-1">
                <PagerButton label={t("first")} disabled={query.page <= 1} onClick={() => go({ page: 1 })}>
                  <ChevronsLeft />
                </PagerButton>
                <PagerButton
                  label={t("previous")}
                  disabled={query.page <= 1}
                  onClick={() => go({ page: query.page - 1 })}
                >
                  <ChevronLeft />
                </PagerButton>
                <div className="hidden items-center gap-1 sm:flex">
                  {pageItems(query.page, pages).map((item, index) =>
                    item === "gap" ? (
                      <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={item}
                        size="icon"
                        variant={item === query.page ? "default" : "outline"}
                        className="size-8 tabular-nums"
                        aria-label={t("goToPage", { page: item })}
                        aria-current={item === query.page ? "page" : undefined}
                        onClick={() => go({ page: item })}
                      >
                        {item}
                      </Button>
                    )
                  )}
                </div>
                <PagerButton
                  label={t("next")}
                  disabled={query.page >= pages}
                  onClick={() => go({ page: query.page + 1 })}
                >
                  <ChevronRight />
                </PagerButton>
                <PagerButton label={t("last")} disabled={query.page >= pages} onClick={() => go({ page: pages })}>
                  <ChevronsRight />
                </PagerButton>
              </div>
            </nav>
          </div>
        </>
      )}

      <ConfirmDialog
        copy={confirming?.confirm ?? null}
        count={selectedIds.length}
        pending={bulk.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming)
            bulk.mutate({ action: confirming, ids: selectedIds }, { onSettled: () => setConfirming(null) })
        }}
      />
    </div>
  )
}

/** The checkbox column, added in front when the table has bulk actions. */
const selectionColumn: DataTableColumns<RowData>[number] = createColumnHelper<Features, RowData>().display({
  id: "select",
  header: ({ table }) => <SelectAll table={table} />,
  cell: ({ row }) => <SelectRow checked={row.getIsSelected()} onChange={(value) => row.toggleSelected(value)} />,
})

function SelectAll({
  table,
}: {
  table: {
    getIsAllPageRowsSelected: () => boolean
    getIsSomePageRowsSelected: () => boolean
    toggleAllPageRowsSelected: (value?: boolean) => void
  }
}) {
  const t = useTranslations("dataTable")
  const all = table.getIsAllPageRowsSelected()
  return (
    <Checkbox
      aria-label={t("selectAll")}
      checked={all ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
    />
  )
}

function SelectRow({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const t = useTranslations("dataTable")
  return (
    <Checkbox aria-label={t("selectRow")} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
  )
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button size="icon" variant="outline" className="size-8" aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  )
}
