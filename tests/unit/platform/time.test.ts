import { describe, expect, it } from "vitest"
import { formatInstant, resolveLocalDateTime } from "@/platform/time"

const US_ZONES = ["America/Chicago", "America/New_York", "America/Los_Angeles"] as const

describe("resolveLocalDateTime", () => {
  it.each(US_ZONES)("requires explicit handling for the spring DST gap in %s", (zone) => {
    expect(() => resolveLocalDateTime("2026-03-08", "02:30", zone)).toThrow()
    expect(resolveLocalDateTime("2026-03-08", "02:30", zone, "earlier")).not.toBe(
      resolveLocalDateTime("2026-03-08", "02:30", zone, "later")
    )
  })

  it.each(US_ZONES)("resolves the autumn DST overlap in %s", (zone) => {
    const earlier = resolveLocalDateTime("2026-11-01", "01:30", zone, "earlier")
    const later = resolveLocalDateTime("2026-11-01", "01:30", zone, "later")

    expect(Date.parse(later) - Date.parse(earlier)).toBe(60 * 60 * 1000)
  })

  it("resolves Vietnamese wall-clock time without a DST adjustment", () => {
    expect(resolveLocalDateTime("2026-06-01", "09:00", "Asia/Ho_Chi_Minh")).toBe("2026-06-01T02:00:00Z")
  })
})

describe("formatInstant", () => {
  it("shows a Vietnam-created booking at the Texas salon's local time", () => {
    const instant = resolveLocalDateTime("2026-06-01", "10:00", "America/Chicago")

    expect(formatInstant(instant, "America/Chicago", "en-US")).toBe("Jun 1, 2026, 10:00 AM CDT")
    expect(formatInstant(instant, "Asia/Ho_Chi_Minh", "vi-VN")).toContain("22:00")
  })
})
