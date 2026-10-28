import { describe, expect, it } from "vitest"
import { slugify } from "@/lib/slugify"

describe("slugify", () => {
  it("folds diacritics and separators to a hyphenated slug", () => {
    expect(slugify("Ngân's Nails")).toBe("ngan-s-nails")
    expect(slugify("Đông Spa & Salon")).toBe("dong-spa-salon")
    expect(slugify("  Rosy Nails  ")).toBe("rosy-nails")
  })

  it("falls back to 'workspace' when nothing remains", () => {
    expect(slugify("!!!")).toBe("workspace")
  })
})
