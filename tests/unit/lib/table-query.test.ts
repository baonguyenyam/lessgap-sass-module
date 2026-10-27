import { describe, expect, it } from "vitest"

import { offsetOf, pageCountOf, parseTableQuery, tableQueryHref, type TableQuerySpec } from "@/lib/table-query"

const spec: TableQuerySpec = {
  sortable: ["createdAt", "email"],
  defaultDir: "desc",
  filters: { role: ["USER", "ADMIN"] },
  defaultPageSize: 20,
}
const defaults = { sort: "createdAt", dir: "desc" as const, pageSize: 20 }

describe("parseTableQuery", () => {
  it("reads every part of a valid URL", () => {
    expect(parseTableQuery({ q: " ada ", page: "3", size: "50", sort: "email", dir: "asc", role: "ADMIN" }, spec)).toEqual({
      q: "ada",
      page: 3,
      pageSize: 50,
      sort: "email",
      dir: "asc",
      filters: { role: "ADMIN" },
    })
  })

  // Everything here arrives from the address bar.
  it("falls back to the defaults for anything not allowed", () => {
    expect(parseTableQuery({ page: "-1", size: "7", sort: "password", dir: "sideways", role: "ROOT" }, spec)).toEqual({
      q: "",
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      dir: "desc",
      filters: {},
    })
    expect(parseTableQuery({ page: "abc" }, spec).page).toBe(1)
  })

  it("takes the first of repeated parameters and cuts a long search", () => {
    const query = parseTableQuery({ page: ["2", "9"], q: "x".repeat(500) }, spec)
    expect(query.page).toBe(2)
    expect(query.q).toHaveLength(100)
  })
})

describe("tableQueryHref", () => {
  const current = parseTableQuery({ q: "ada", page: "3", role: "USER" }, spec)

  it("keeps the state it is not asked to change", () => {
    expect(tableQueryHref("/admin/users", current, { page: 4 }, defaults)).toBe("/admin/users?q=ada&role=USER&page=4")
  })

  it("goes back to page 1 when the matching rows change", () => {
    expect(tableQueryHref("/admin/users", current, { q: "bob" }, defaults)).toBe("/admin/users?q=bob&role=USER")
    expect(tableQueryHref("/admin/users", current, { filters: { role: null } }, defaults)).toBe("/admin/users?q=ada")
    expect(tableQueryHref("/admin/users", current, { pageSize: 50 }, defaults)).toBe("/admin/users?q=ada&role=USER&size=50")
  })

  it("leaves defaults out of the URL", () => {
    expect(tableQueryHref("/x", parseTableQuery({}, spec), {}, defaults)).toBe("/x")
    expect(tableQueryHref("/x", parseTableQuery({}, spec), { sort: "email", dir: "asc" }, defaults)).toBe("/x?sort=email&dir=asc")
  })
})

describe("paging helpers", () => {
  it("computes the offset and never reports zero pages", () => {
    expect(offsetOf({ page: 3, pageSize: 20 })).toBe(40)
    expect(pageCountOf(0, 20)).toBe(1)
    expect(pageCountOf(41, 20)).toBe(3)
  })
})
