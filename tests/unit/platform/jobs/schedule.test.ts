import { describe, expect, it } from "vitest"

import { backoffMinutes, nextRun, parseCron } from "@/platform/jobs/schedule"

const at = (iso: string) => new Date(iso)

describe("nextRun", () => {
  it("finds the next matching minute, strictly after the given time", () => {
    expect(nextRun("*/5 * * * *", at("2026-10-27T10:03:30Z")).toISOString()).toBe("2026-10-27T10:05:00.000Z")
    expect(nextRun("*/5 * * * *", at("2026-10-27T10:05:00Z")).toISOString()).toBe("2026-10-27T10:10:00.000Z")
  })

  it("rolls over hours, days and months", () => {
    expect(nextRun("30 3 * * *", at("2026-10-27T04:00:00Z")).toISOString()).toBe("2026-10-28T03:30:00.000Z")
    expect(nextRun("0 0 1 * *", at("2026-12-15T00:00:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z")
  })

  it("reads ranges, lists and weekdays", () => {
    // Weekdays at 09:00: Friday 2026-10-30 after 10:00 → Monday 2026-11-02.
    expect(nextRun("0 9 * * 1-5", at("2026-10-30T10:00:00Z")).toISOString()).toBe("2026-11-02T09:00:00.000Z")
    expect(nextRun("15,45 * * * *", at("2026-10-27T10:20:00Z")).toISOString()).toBe("2026-10-27T10:45:00.000Z")
  })

  it("matches either day field when both are restricted, as cron does", () => {
    // The 1st of the month or any Sunday; 2026-11-01 is a Sunday anyway, so check the 13th → Sunday the 15th.
    expect(nextRun("0 0 1 * 0", at("2026-11-13T00:00:00Z")).toISOString()).toBe("2026-11-15T00:00:00.000Z")
  })

  it("refuses an expression it cannot read", () => {
    expect(() => parseCron("* * * *")).toThrow(/5 fields/)
    expect(() => parseCron("61 * * * *")).toThrow(/outside/)
    expect(() => parseCron("*/0 * * * *")).toThrow(/step/)
  })
})

describe("backoffMinutes", () => {
  it("doubles from one minute and stops at an hour", () => {
    expect([1, 2, 3, 4, 8, 20].map(backoffMinutes)).toEqual([1, 2, 4, 8, 60, 60])
  })
})
