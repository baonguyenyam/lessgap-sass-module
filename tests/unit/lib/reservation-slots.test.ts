import { describe, expect, it } from "vitest"
import { reservationSlots } from "@/lib/booking/reservations"

const rule = {
  weekday: 0, // Sunday UTC = March 8 2027 is Monday; use weekday 1.
  startMinute: 11 * 60,
  endMinute: 14 * 60,
  slotMinutes: 90,
  turnMinutes: 15,
  minPartySize: 1,
  maxPartySize: 8,
}
const tables = [
  { id: "t2", capacity: 2, area: "main" },
  { id: "t6", capacity: 6, area: "main" },
]
const range = { startTs: "2027-03-09T00:00:00.000Z", endTs: "2027-03-10T00:00:00.000Z" } // Tuesday March 9

describe("reservationSlots (5.8)", () => {
  it("emits slots only for tables that fit the party", () => {
    const slots = reservationSlots([{ ...rule, weekday: 2 }], tables, [], 4, range)
    expect(slots.every((s) => s.tableId === "t6")).toBe(true)
    expect(slots.length).toBe(2) // 11:00 and 12:30 — 90-min slots in 11:00-14:00
  })

  it("a party outside the rule's size range gets nothing", () => {
    expect(reservationSlots([{ ...rule, weekday: 2 }], tables, [], 10, range)).toHaveLength(0)
  })

  it("an existing reservation blocks its slot plus the turn time", () => {
    const slots = reservationSlots(
      [{ ...rule, weekday: 2 }],
      [{ id: "t4", capacity: 4, area: "main" }],
      [{ tableId: "t4", startTs: "2027-03-09 11:00:00.000", endTs: "2027-03-09 12:30:00.000", status: "confirmed" }],
      2,
      range
    )
    // 11:00 busy (reservation + 15-min turn to 12:45); 12:30 overlaps the turn → also out.
    expect(slots).toHaveLength(0)
  })

  it("a canceled reservation frees the table", () => {
    const slots = reservationSlots(
      [{ ...rule, weekday: 2 }],
      [{ id: "t4", capacity: 4, area: "main" }],
      [{ tableId: "t4", startTs: "2027-03-09 11:00:00.000", endTs: "2027-03-09 12:30:00.000", status: "canceled" }],
      2,
      range
    )
    expect(slots).toHaveLength(2)
  })
})
