import { describe, expect, it } from "vitest"
import { dueForReminder } from "@/lib/booking/reminders"

const now = new Date("2027-03-08T10:00:00Z")

describe("dueForReminder (5.7)", () => {
  it("fires the 24h window when the start is inside it and never reminded", () => {
    expect(dueForReminder("2027-03-09T08:00:00Z", null, [1440, 120], now)).toBe(1440)
  })

  it("fires the 2h window when the 24h one already sent", () => {
    // Sent at 22h-out; now inside 2h — the smaller window is due.
    // The 24h reminder sent at 3h-out — before the 2h window opened.
    const reminded = new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
    expect(dueForReminder("2027-03-08T11:00:00Z", reminded, [1440, 120], now)).toBe(120)
  })

  it("does not fire when the start is past every window or already reminded", () => {
    expect(dueForReminder("2027-03-10T10:00:00Z", null, [1440, 120], now)).toBeNull() // >24h out
    const reminded = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
    expect(dueForReminder("2027-03-08T11:00:00Z", reminded, [1440, 120], now)).toBeNull() // already sent inside 2h
  })
})
