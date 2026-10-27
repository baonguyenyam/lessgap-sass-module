import { describe, expect, it } from "vitest"
import { isAppLocale } from "@/i18n/app-locale"
import { APP_LOCALES } from "@/platform/settings/registry"

describe("isAppLocale", () => {
  it("accepts every language the private area ships", () => {
    for (const locale of APP_LOCALES) expect(isAppLocale(locale)).toBe(true)
  })

  it("rejects anything else a cookie could carry", () => {
    for (const value of ["", "xx", "EN", "en-US", undefined, null, 1]) expect(isAppLocale(value)).toBe(false)
  })
})
