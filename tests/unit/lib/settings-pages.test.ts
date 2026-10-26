import { describe, expect, it } from "vitest"

import { SETTINGS_PAGES, settingsHref, settingsMessage } from "@/lib/settings-pages"

describe("settings pages", () => {
  it("puts every page under the settings URL, general first", () => {
    expect(SETTINGS_PAGES[0]).toEqual({ key: "general", href: "/dashboard/settings" })
    for (const page of SETTINGS_PAGES) expect(page.href.startsWith("/dashboard/settings")).toBe(true)
    expect(settingsHref("security")).toBe("/dashboard/settings/security")
  })
})

describe("settingsMessage", () => {
  it("reads a known code with its tone", () => {
    expect(settingsMessage("password")).toEqual({ code: "password", error: false })
    expect(settingsMessage("last-root")).toEqual({ code: "last-root", error: true })
  })

  // The code comes from the query string: anything can arrive there.
  it("ignores missing, unknown and inherited keys", () => {
    expect(settingsMessage(undefined)).toBeNull()
    expect(settingsMessage("nope")).toBeNull()
    expect(settingsMessage("toString")).toBeNull()
  })
})
