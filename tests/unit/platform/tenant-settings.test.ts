import { describe, expect, it } from "vitest"
import { readSettings, TENANT_SETTING_KEYS } from "@/platform/settings/registry"
import { mergeTenantSettings } from "@/platform/settings/tenant"

describe("mergeTenantSettings", () => {
  const platform = readSettings([])

  it("puts the tenant's own values over the platform's", () => {
    const merged = mergeTenantSettings(platform, [
      { key: "display.time_zone", value: "Asia/Ho_Chi_Minh" },
      { key: "locale.app", value: "vi" },
    ])
    expect(merged["display.time_zone"]).toBe("Asia/Ho_Chi_Minh")
    expect(merged["locale.app"]).toBe("vi")
    expect(merged["display.page_size"]).toBe(platform["display.page_size"])
  })

  it("ignores keys a tenant may not set and values that do not parse", () => {
    const merged = mergeTenantSettings(platform, [
      { key: "signup.enabled", value: !platform["signup.enabled"] },
      { key: "display.time_zone", value: "Not/AZone" },
    ])
    expect(merged).toEqual(platform)
  })

  it("only lets a tenant set display and language", () => {
    for (const key of TENANT_SETTING_KEYS) expect(key.startsWith("display.") || key === "locale.app").toBe(true)
  })
})
