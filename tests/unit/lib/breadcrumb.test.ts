import { describe, it, expect } from "vitest"

import { siteConfig } from "@/config/site"
import { breadcrumbJsonLd, type Crumb } from "@/lib/breadcrumb"

const trail: Crumb[] = [
  { name: "Home", href: "/" },
  { name: "Changelog", href: "/changelog" },
  { name: "A release", href: "/changelog/a-release" },
]

describe("breadcrumbJsonLd", () => {
  it("declares a BreadcrumbList", () => {
    const out = breadcrumbJsonLd(trail)

    expect(out["@context"]).toBe("https://schema.org")
    expect(out["@type"]).toBe("BreadcrumbList")
  })

  it("keeps one item per crumb, in order", () => {
    const out = breadcrumbJsonLd(trail)

    expect(out.itemListElement).toHaveLength(trail.length)
    expect(out.itemListElement.map((item) => item.name)).toEqual(["Home", "Changelog", "A release"])
  })

  // Schema.org counts from one. Emitting the array index would put the first
  // crumb at position 0, which is the kind of thing that keeps validating
  // while search engines quietly discard the trail.
  it("numbers positions from one", () => {
    const out = breadcrumbJsonLd(trail)

    expect(out.itemListElement.map((item) => item.position)).toEqual([1, 2, 3])
  })

  // The visible row links relatively and the structured data has to be
  // absolute; building both from one array is the point of the module.
  it("turns each path into an absolute URL", () => {
    const out = breadcrumbJsonLd(trail)

    expect(out.itemListElement.map((item) => item.item)).toEqual([
      `${siteConfig.url}/`,
      `${siteConfig.url}/changelog`,
      `${siteConfig.url}/changelog/a-release`,
    ])
  })

  it("returns an empty list for an empty trail", () => {
    expect(breadcrumbJsonLd([]).itemListElement).toEqual([])
  })
})
