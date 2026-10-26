import { describe, expect, it } from "vitest"

import { nowTs, toDate, toTs } from "@/lib/timestamps"

describe("toDate / toTs", () => {
  it("reads a stored value as UTC, whatever the machine's zone", () => {
    expect(toDate("2026-10-26 19:15:31.288").toISOString()).toBe("2026-10-26T19:15:31.288Z")
  })

  it("writes a Date in the stored format", () => {
    expect(toTs(new Date("2026-10-26T19:15:31.288Z"))).toBe("2026-10-26 19:15:31.288")
  })

  it("round-trips", () => {
    const date = new Date("2024-02-29T23:59:59.999Z")
    expect(toDate(toTs(date)).getTime()).toBe(date.getTime())
  })

  it("passes null and undefined through as null", () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toTs(null)).toBeNull()
  })

  it("nowTs is the current instant", () => {
    const before = Date.now()
    const now = toDate(nowTs()).getTime()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThanOrEqual(Date.now())
  })
})
