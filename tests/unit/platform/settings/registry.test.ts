import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  APP_LOCALES,
  PLATFORM_SETTINGS,
  SETTING_KEYS,
  canEditSetting,
  parseSettingValue,
  readSettings,
} from "@/platform/settings/registry"

describe("readSettings", () => {
  it("is every default when nothing is stored", () => {
    const settings = readSettings([])
    for (const key of SETTING_KEYS) expect(settings[key]).toEqual(PLATFORM_SETTINGS[key].default)
  })

  it("takes stored values and ignores unknown keys and values that no longer parse", () => {
    const settings = readSettings([
      { key: "display.page_size", value: 50 },
      { key: "display.time_zone", value: "Asia/Ho_Chi_Minh" },
      { key: "locale.app", value: "klingon" },
      { key: "no.such.key", value: 1 },
    ])
    expect(settings["display.page_size"]).toBe(50)
    expect(settings["display.time_zone"]).toBe("Asia/Ho_Chi_Minh")
    expect(settings["locale.app"]).toBe("en")
  })
})

describe("canEditSetting", () => {
  it("lets admins change display settings and keeps the rest for ROOT", () => {
    expect(canEditSetting("ADMIN", "display.page_size")).toBe(true)
    expect(canEditSetting("ADMIN", "signup.enabled")).toBe(false)
    expect(canEditSetting("ADMIN", "locale.app")).toBe(false)
    expect(canEditSetting("ROOT", "signup.enabled")).toBe(true)
    expect(canEditSetting("USER", "display.page_size")).toBe(false)
    expect(canEditSetting(null, "display.page_size")).toBe(false)
  })
})

describe("parseSettingValue", () => {
  it("accepts what a form sends and refuses anything else", () => {
    expect(parseSettingValue("display.page_size", "100")).toBe(100)
    expect(parseSettingValue("display.page_size", "7")).toBeNull()
    expect(parseSettingValue("signup.enabled", "false")).toBe(false)
    expect(parseSettingValue("display.time_zone", "Mars/Olympus")).toBeNull()
  })
})

describe("APP_LOCALES", () => {
  it("has a message file for every language offered", () => {
    for (const locale of APP_LOCALES)
      expect(existsSync(join(process.cwd(), "src", "locales", `${locale}.json`))).toBe(true)
  })
})

describe("dateTimeFormats", () => {
  it("builds the named formats from the display settings", async () => {
    const { dateTimeFormats } = await import("@/platform/settings/registry")
    const formats = dateTimeFormats({ "display.date_style": "long", "display.hour_cycle": "h12" })
    expect(formats.date).toEqual({ dateStyle: "long" })
    const at = new Date("2026-10-27T15:05:00Z")
    expect(new Intl.DateTimeFormat("en-US", { ...formats.dateTime, timeZone: "UTC" }).format(at)).toBe(
      "October 27, 2026 at 3:05 PM"
    )
  })
})

describe("timeZoneLabel", () => {
  it("leads with today's name for zones the runtime lists under an old one", async () => {
    const { timeZoneLabel } = await import("@/platform/settings/fields")
    expect(timeZoneLabel("Asia/Saigon")).toBe("Asia/Ho_Chi_Minh (Asia/Saigon)")
    expect(timeZoneLabel("Europe/Paris")).toBe("Europe/Paris")
  })
})
