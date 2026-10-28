import { describe, expect, it } from "vitest"
import { fromAcceptLanguage, isAppLocale, resolveAppLocale } from "@/i18n/app-locale"
import { APP_LOCALES } from "@/platform/settings/registry"

describe("isAppLocale", () => {
  it("accepts every language the private area ships", () => {
    for (const locale of APP_LOCALES) expect(isAppLocale(locale)).toBe(true)
  })

  it("rejects anything else a cookie could carry", () => {
    for (const value of ["", "xx", "EN", "en-US", undefined, null, 1]) expect(isAppLocale(value)).toBe(false)
  })
})

describe("fromAcceptLanguage", () => {
  it("takes the highest quality supported language, an exact tag or its base", () => {
    expect(fromAcceptLanguage("vi-VN,vi;q=0.9,en;q=0.8")).toBe("vi")
    expect(fromAcceptLanguage("fr-FR,fr;q=0.9,en-US;q=0.8,vi;q=0.7")).toBe("en")
    expect(fromAcceptLanguage("en;q=0.5, vi;q=0.9")).toBe("vi")
  })

  it("finds nothing in an empty, unsupported or zero-quality header", () => {
    expect(fromAcceptLanguage(null)).toBeNull()
    expect(fromAcceptLanguage("fr, de")).toBeNull()
    expect(fromAcceptLanguage("vi;q=0")).toBeNull()
  })
})

describe("resolveAppLocale", () => {
  const base = { cookie: undefined, preference: undefined, acceptLanguage: null, fallback: "en" as const }

  it("prefers the language picked on this device, then the saved preference", () => {
    expect(resolveAppLocale({ ...base, cookie: "vi", preference: "en" })).toBe("vi")
    expect(resolveAppLocale({ ...base, preference: "vi", acceptLanguage: "en" })).toBe("vi")
  })

  it("lets a saved preference beat the browser header", () => {
    expect(resolveAppLocale({ ...base, preference: "en", acceptLanguage: "vi-VN" })).toBe("en")
  })

  it("uses the browser, then the default, and ignores unknown values", () => {
    expect(resolveAppLocale({ ...base, acceptLanguage: "vi-VN" })).toBe("vi")
    expect(resolveAppLocale({ ...base, cookie: "xx", preference: "it", acceptLanguage: "de" })).toBe("en")
  })
})
