import { describe, expect, it } from "vitest"
import { localeAlternates, localizedPath } from "./alternates"
import { siteConfig } from "@/config/site"

/**
 * These pin an SEO rule whose failure is silent and slow.
 *
 * Every page under `[locale]` resolves in every locale, because an
 * untranslated one falls back to English rather than 404. Announce those URLs
 * as alternates and you have told a search engine that two addresses hold the
 * same page in two languages, when they hold the same page in one: duplicate
 * content, published by us, about ourselves, discovered months later as a
 * ranking that went nowhere.
 *
 * Nothing else can catch it. The pages render, the build passes, and the
 * markup is well formed either way.
 */
const url = (path: string) => `${siteConfig.url}${path}`

describe("localizedPath", () => {
  it("leaves the default locale unprefixed, so indexed URLs never move", () => {
    expect(localizedPath("/pricing", "en")).toBe("/pricing")
    expect(localizedPath("/pricing", "it")).toBe("/it/pricing")
  })
})

describe("localeAlternates", () => {
  it("cross-links the languages a page really exists in, and names an x-default", () => {
    const alternates = localeAlternates("/changelog", "it", ["en", "it"])
    expect(alternates).toEqual({
      canonical: url("/it/changelog"),
      languages: {
        en: url("/changelog"),
        it: url("/it/changelog"),
        "x-default": url("/changelog"),
      },
    })
  })

  it("declares no alternate for a page that exists in one language", () => {
    expect(localeAlternates("/pricing", "en", ["en"])).toEqual({
      canonical: url("/pricing"),
    })
  })

  it("points a fallback page at the original instead of claiming to be one", () => {
    // `/it/pricing` serves the English text. Self-canonicalising here
    // is the whole defect: it submits a second address for the same words.
    expect(localeAlternates("/pricing", "it", ["en"])).toEqual({
      canonical: url("/pricing"),
    })
  })
})
