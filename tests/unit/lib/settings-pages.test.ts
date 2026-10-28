import { describe, expect, it } from "vitest"

import { ACCOUNT_PAGES, accountHref, settingsMessage, settingsPages } from "@/lib/settings-pages"

describe("account and settings pages", () => {
  it("puts every account page under the account URL, profile first", () => {
    expect(ACCOUNT_PAGES[0]).toEqual({ key: "profile", href: "/dashboard/account" })
    for (const page of ACCOUNT_PAGES) expect(page.href.startsWith("/dashboard/account")).toBe(true)
    expect(accountHref("security")).toBe("/dashboard/account/security")
  })

  it("opens settings on the tenant's general page", () => {
    const pages = settingsPages("acme")
    expect(pages[0]).toEqual({ key: "general", segment: null, href: "/t/acme/settings" })
    expect(pages.map((p) => p.href)).toEqual([
      "/t/acme/settings",
      "/t/acme/settings/localization",
      "/t/acme/settings/display",
    ])
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
