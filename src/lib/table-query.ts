/**
 * The state of a list page, kept in the URL: `?q=…&page=2&size=50&sort=email&dir=asc&role=ADMIN`.
 *
 * The server page parses it to run the query and passes the result to the
 * table, which builds its links from the same value. Everything in the URL is
 * untrusted: a sort key, filter value or page size the page does not allow is
 * dropped for the default, never passed to a query.
 */
export const PAGE_SIZES = [10, 20, 50, 100] as const

export type SortDirection = "asc" | "desc"

export type TableQuery = {
  page: number
  pageSize: number
  q: string
  sort: string
  dir: SortDirection
  filters: Record<string, string>
}

export type TableQuerySpec = {
  /** Column keys the list may be sorted by; the first is the default. */
  sortable: readonly string[]
  defaultDir: SortDirection
  /** Allowed values for each filter key. A missing or unknown value means "all". */
  filters?: Record<string, readonly string[]>
  /** Rows per page when the URL says nothing, from the platform settings. */
  defaultPageSize: number
}

type Params = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Longer search terms are cut, so a pasted essay cannot become a query. */
export const MAX_SEARCH_LENGTH = 100

export function parseTableQuery(params: Params, spec: TableQuerySpec): TableQuery {
  const pageNumber = Number.parseInt(first(params.page) ?? "", 10)
  const sizeNumber = Number.parseInt(first(params.size) ?? "", 10)
  const sort = first(params.sort) ?? ""
  const dir = first(params.dir)

  const filters: Record<string, string> = {}
  for (const [key, allowed] of Object.entries(spec.filters ?? {})) {
    const value = first(params[key])
    if (value && allowed.includes(value)) filters[key] = value
  }

  return {
    page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(sizeNumber) ? sizeNumber : spec.defaultPageSize,
    q: (first(params.q) ?? "").trim().slice(0, MAX_SEARCH_LENGTH),
    sort: spec.sortable.includes(sort) ? sort : spec.sortable[0],
    dir: dir === "asc" || dir === "desc" ? dir : spec.defaultDir,
    filters,
  }
}

/** Rows to skip for the current page. */
export const offsetOf = (query: Pick<TableQuery, "page" | "pageSize">) => (query.page - 1) * query.pageSize

/** At least one page, so "page 1 of 1" reads right on an empty list. */
export const pageCountOf = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize))

export type TableQueryPatch = Partial<Omit<TableQuery, "filters">> & { filters?: Record<string, string | null> }

/**
 * The URL of the same list with some of its state changed. Anything that
 * changes which rows match (search, filter, sort, page size) goes back to page
 * 1; values equal to the defaults are left out, so links stay short.
 */
export function tableQueryHref(
  pathname: string,
  current: TableQuery,
  patch: TableQueryPatch,
  defaults: { sort: string; dir: SortDirection; pageSize: number }
): string {
  const filters = { ...current.filters }
  for (const [key, value] of Object.entries(patch.filters ?? {})) {
    if (value) filters[key] = value
    else delete filters[key]
  }
  const resetsPage =
    patch.q !== undefined || patch.filters !== undefined || patch.sort !== undefined || patch.dir !== undefined || patch.pageSize !== undefined
  const next = {
    q: patch.q ?? current.q,
    sort: patch.sort ?? current.sort,
    dir: patch.dir ?? current.dir,
    pageSize: patch.pageSize ?? current.pageSize,
    page: patch.page ?? (resetsPage ? 1 : current.page),
  }

  const params = new URLSearchParams()
  if (next.q) params.set("q", next.q)
  for (const [key, value] of Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))) params.set(key, value)
  if (next.sort !== defaults.sort || next.dir !== defaults.dir) {
    params.set("sort", next.sort)
    params.set("dir", next.dir)
  }
  if (next.pageSize !== defaults.pageSize) params.set("size", String(next.pageSize))
  if (next.page > 1) params.set("page", String(next.page))
  const search = params.toString()
  return search ? `${pathname}?${search}` : pathname
}
