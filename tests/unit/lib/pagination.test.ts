import { describe, expect, it } from "vitest"
import { pageItems } from "@/lib/pagination"

describe("pageItems", () => {
  it("lists every page when they all fit", () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(pageItems(1, 0)).toEqual([])
  })

  it("keeps the start whole near the first page", () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10])
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10])
  })

  it("keeps the end whole near the last page", () => {
    expect(pageItems(10, 10)).toEqual([1, "gap", 6, 7, 8, 9, 10])
    expect(pageItems(8, 10)).toEqual([1, "gap", 6, 7, 8, 9, 10])
  })

  it("shows the current page with its neighbours between two gaps", () => {
    expect(pageItems(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10])
  })

  it("always gives the same number of buttons once pages are skipped", () => {
    for (let page = 1; page <= 20; page++) expect(pageItems(page, 20)).toHaveLength(7)
  })

  it("clamps a page outside the range", () => {
    expect(pageItems(99, 10)).toEqual(pageItems(10, 10))
    expect(pageItems(-3, 10)).toEqual(pageItems(1, 10))
  })
})
