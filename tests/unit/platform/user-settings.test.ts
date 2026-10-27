import { describe, expect, it } from "vitest"
import { readSettings } from "@/platform/settings/registry"
import { mergeUserSettings, readNotifications } from "@/platform/settings/user"

describe("mergeUserSettings", () => {
  const base = readSettings([])

  it("puts a person's own values over their workspace's", () => {
    const merged = mergeUserSettings(base, [{ key: "display.hour_cycle", value: "h12" }])
    expect(merged["display.hour_cycle"]).toBe("h12")
  })

  it("ignores keys a person may not set and values that do not parse", () => {
    const merged = mergeUserSettings(base, [
      { key: "display.page_size", value: 50 },
      { key: "signup.enabled", value: false },
      { key: "display.time_zone", value: "Not/AZone" },
    ])
    expect(merged).toEqual(base)
  })
})

describe("readNotifications", () => {
  it("keeps every email on until turned off", () => {
    expect(readNotifications([])).toEqual({ "notify.product_updates": true, "notify.tips": true })
    expect(
      readNotifications([
        { key: "notify.tips", value: false },
        { key: "notify.tips2", value: false },
      ])["notify.tips"]
    ).toBe(false)
  })
})
