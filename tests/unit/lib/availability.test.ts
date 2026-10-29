import { describe, expect, it } from "vitest"
import { availableSlots, localDate, localWeekday, wallToUtc, type WeeklyRule } from "@/lib/availability"

const rule = (weekday: number, startMinute: number, endMinute: number, staffId = "s1"): WeeklyRule => ({
  weekday,
  startMinute,
  endMinute,
  staffId,
})

const service = { durationMinutes: 30 }

describe("wallToUtc / local helpers (5.1)", () => {
  it("converts a local wall time to the right UTC instant", () => {
    // 09:00 in New York on March 1 2027 is EST (-5) → 14:00Z.
    expect(wallToUtc("2027-03-01", 9 * 60, "America/New_York").toISOString()).toBe("2027-03-01T14:00:00.000Z")
  })

  it("maps the same wall time differently across a DST boundary", () => {
    // March 14 2027 is the US spring-forward Sunday: 09:00 is EDT (-4) → 13:00Z.
    expect(wallToUtc("2027-03-14", 9 * 60, "America/New_York").toISOString()).toBe("2027-03-14T13:00:00.000Z")
    // A week earlier it was EST (-5) → 14:00Z.
    expect(wallToUtc("2027-03-07", 9 * 60, "America/New_York").toISOString()).toBe("2027-03-07T14:00:00.000Z")
  })

  it("localDate/localWeekday see the day in the zone, not in UTC", () => {
    // 23:30Z in New York on March 1 is 18:30 local — still March 1, a Monday.
    const instant = new Date("2027-03-02T04:30:00Z") // 23:30 EST March 1
    expect(localDate(instant, "America/New_York")).toBe("2027-03-01")
    expect(localWeekday(instant, "America/New_York")).toBe(1)
    expect(localDate(instant, "UTC")).toBe("2027-03-02")
  })
})

describe("availableSlots — weekly rules (5.1)", () => {
  it("offers stepped slots inside a weekday's opening hours", () => {
    const slots = availableSlots(
      [rule(1, 9 * 60, 12 * 60)], // Monday 09:00–12:00
      [],
      [],
      service,
      "s1",
      { startTs: "2027-03-01T00:00:00Z", endTs: "2027-03-01T23:59:59Z" },
      "UTC"
    )
    expect(slots[0].startTs).toBe("2027-03-01T09:00:00.000Z")
    expect(slots.length).toBe(11) // 15-min steps, 30-min service: 09:00…11:30
    expect(slots.at(-1)!.endTs).toBe("2027-03-01T12:00:00.000Z")
  })

  it("the last slot must end by closing time, not just start before it", () => {
    const slots = availableSlots(
      [rule(1, 9 * 60, 11 * 60 + 15)], // closes 11:15
      [],
      [],
      { durationMinutes: 30 },
      "s1",
      { startTs: "2027-03-01T00:00:00Z", endTs: "2027-03-01T23:59:59Z" },
      "UTC",
      { stepMinutes: 15 }
    )
    // 09:00…10:45 fit a 30-minute slot ending ≤ 11:15.
    expect(slots.at(-1)!.startTs).toBe("2027-03-01T10:45:00.000Z")
  })
})

describe("availableSlots — DST (5.1)", () => {
  it("spring forward, America/New_York: the Sunday's slots shift an hour in UTC", () => {
    // Sunday March 14 2027 — 09:00–12:00 local.
    const slots = availableSlots(
      [rule(0, 9 * 60, 12 * 60)],
      [],
      [],
      { durationMinutes: 60 },
      "s1",
      { startTs: "2027-03-14T00:00:00Z", endTs: "2027-03-14T23:59:59Z" },
      "America/New_York",
      { stepMinutes: 60 }
    )
    // 09:00/10:00/11:00 EDT = 13:00/14:00/15:00 UTC.
    expect(slots.map((s) => s.startTs)).toEqual([
      "2027-03-14T13:00:00.000Z",
      "2027-03-14T14:00:00.000Z",
      "2027-03-14T15:00:00.000Z",
    ])
  })

  it("spring forward, America/Chicago: the missing hour produces no phantom slot", () => {
    // Sunday March 14 2027 in Chicago (CDT): a rule inside the 02:00–03:00
    // gap has no real slots; a normal morning rule still works in UTC.
    const gapSlots = availableSlots(
      [rule(0, 2 * 60, 4 * 60)],
      [],
      [],
      { durationMinutes: 60 },
      "s1",
      { startTs: "2027-03-14T00:00:00Z", endTs: "2027-03-14T23:59:59Z" },
      "America/Chicago",
      { stepMinutes: 60 }
    )
    // Local 02:00–03:00 doesn't exist; the gap maps near 03:00 local — at
    // most one candidate, and never one claiming a wall time inside the gap.
    expect(gapSlots.length).toBeLessThanOrEqual(1)
    const morning = availableSlots(
      [rule(0, 9 * 60, 11 * 60)],
      [],
      [],
      { durationMinutes: 60 },
      "s1",
      { startTs: "2027-03-14T00:00:00Z", endTs: "2027-03-14T23:59:59Z" },
      "America/Chicago",
      { stepMinutes: 60 }
    )
    // 09:00/10:00 CDT = 14:00/15:00 UTC.
    expect(morning.map((s) => s.startTs)).toEqual(["2027-03-14T14:00:00.000Z", "2027-03-14T15:00:00.000Z"])
  })

  it("fall back, America/Chicago: the repeated hour keeps both sides of the transition", () => {
    // Sunday November 7 2027 — fall back 02:00→01:00 CDT→CST. Rule 01:00–03:00 local.
    const slots = availableSlots(
      [rule(0, 1 * 60, 3 * 60)],
      [],
      [],
      { durationMinutes: 60 },
      "s1",
      { startTs: "2027-11-07T00:00:00Z", endTs: "2027-11-07T23:59:59Z" },
      "America/Chicago",
      { stepMinutes: 60 }
    )
    // The wall times map to real instants on either side of the transition —
    // at least the 01:00 (CDT → 06:00Z) and 02:00 (CST → 08:00Z) starts.
    expect(slots.map((s) => s.startTs)).toContain("2027-11-07T06:00:00.000Z")
    expect(slots.map((s) => s.startTs)).toContain("2027-11-07T08:00:00.000Z")
  })

  it("fall back, America/New_York: a rule spanning the transition converts end correctly", () => {
    const slots = availableSlots(
      [rule(0, 9 * 60, 12 * 60)],
      [],
      [],
      { durationMinutes: 60 },
      "s1",
      { startTs: "2027-11-07T00:00:00Z", endTs: "2027-11-07T23:59:59Z" },
      "America/New_York",
      { stepMinutes: 60 }
    )
    // 09:00/10:00/11:00 EST = 14:00/15:00/16:00 UTC.
    expect(slots.map((s) => s.startTs)).toEqual([
      "2027-11-07T14:00:00.000Z",
      "2027-11-07T15:00:00.000Z",
      "2027-11-07T16:00:00.000Z",
    ])
  })
})

describe("availableSlots — blockers (5.1)", () => {
  const monday = { startTs: "2027-03-01T00:00:00Z", endTs: "2027-03-01T23:59:59Z" }
  const rules = [rule(1, 9 * 60, 17 * 60)]

  it("an existing appointment blocks overlapping slots, with buffers", () => {
    const slots = availableSlots(
      rules,
      [],
      [{ staffId: "s1", startTs: "2027-03-01T10:00:00Z", endTs: "2027-03-01T11:00:00Z", bufferAfterMinutes: 15 }],
      { durationMinutes: 30, bufferBeforeMinutes: 15 },
      "s1",
      monday,
      "UTC"
    )
    // Slots whose [start-15, end] touch [10:00, 11:15] are out: 09:45–11:15 starts.
    const starts = slots.map((s) => s.startTs)
    expect(starts).not.toContain("2027-03-01T10:00:00.000Z")
    expect(starts).not.toContain("2027-03-01T09:45:00.000Z")
    expect(starts).not.toContain("2027-03-01T11:00:00.000Z")
    expect(starts).toContain("2027-03-01T11:15:00.000Z")
  })

  it("a canceled appointment does not block", () => {
    const slots = availableSlots(
      rules,
      [],
      [{ staffId: "s1", startTs: "2027-03-01T10:00:00Z", endTs: "2027-03-01T11:00:00Z", status: "canceled" }],
      service,
      "s1",
      monday,
      "UTC"
    )
    expect(slots.map((s) => s.startTs)).toContain("2027-03-01T10:00:00.000Z")
  })

  it("timeOff for a staff member closes their day", () => {
    const slots = availableSlots(
      rules,
      [{ staffId: "s1", startTs: "2027-03-01T00:00:00Z", endTs: "2027-03-01T23:59:00Z" }],
      [],
      service,
      "s1",
      monday,
      "UTC"
    )
    expect(slots).toEqual([])
  })

  it("minimum notice hides slots too soon", () => {
    const slots = availableSlots(rules, [], [], service, "s1", monday, "UTC", {
      minNoticeMinutes: 60 * 10,
      stepMinutes: 60,
    })
    expect(slots.map((s) => s.startTs)).not.toContain("2027-03-01T09:00:00.000Z")
    expect(slots[0].startTs).toBe("2027-03-01T10:00:00.000Z")
  })

  it("maximum advance hides slots too far out", () => {
    const slots = availableSlots(rules, [], [], service, "s1", monday, "UTC", {
      maxAdvanceMinutes: 60 * 11,
      stepMinutes: 60,
    })
    expect(slots.map((s) => s.startTs)).toContain("2027-03-01T10:00:00.000Z")
    expect(slots.map((s) => s.startTs)).not.toContain("2027-03-01T12:00:00.000Z")
  })
})

describe("availableSlots — any staff (5.1)", () => {
  it("offers a slot when at least one staff is free, preferring the least busy", () => {
    const slots = availableSlots(
      [rule(1, 9 * 60, 12 * 60, "s1"), rule(1, 9 * 60, 12 * 60, "s2")],
      [],
      [
        { staffId: "s1", startTs: "2027-03-01T09:00:00Z", endTs: "2027-03-01T10:00:00Z" },
        { staffId: "s1", startTs: "2027-03-01T10:00:00Z", endTs: "2027-03-01T11:00:00Z" },
      ],
      { durationMinutes: 60 },
      "any",
      { startTs: "2027-03-01T00:00:00Z", endTs: "2027-03-01T23:59:59Z" },
      "UTC",
      { stepMinutes: 60 }
    )
    // One slot per start — s2 covers 09:00/10:00 because s1 is busy; s2 also
    // wins 11:00 only if fewer appointments — s2 has 0, s1 has 2 → s2.
    const at9 = slots.find((s) => s.startTs === "2027-03-01T09:00:00.000Z")
    expect(at9?.staffId).toBe("s2")
    const at11 = slots.find((s) => s.startTs === "2027-03-01T11:00:00.000Z")
    expect(at11?.staffId).toBe("s2")
  })
})
