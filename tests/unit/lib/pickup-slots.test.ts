import { describe, expect, it } from "vitest"
import { pickupSlots, orderLineTotal } from "@/lib/ordering/slots"

const rule = { weekday: 3, startMinute: 660, endMinute: 720, slotMinutes: 30 } // Wednesday 11:00–12:00

describe("pickupSlots (6.5)", () => {
  const range = { startTs: "2026-10-28T00:00:00.000Z", endTs: "2026-10-29T00:00:00.000Z" }

  it("emits slots inside the rule's window", () => {
    const slots = pickupSlots([rule], 3, [], range)
    expect(slots).toEqual([
      { startTs: "2026-10-28T11:00:00.000Z", endTs: "2026-10-28T11:30:00.000Z", remaining: 3 },
      { startTs: "2026-10-28T11:30:00.000Z", endTs: "2026-10-28T12:00:00.000Z", remaining: 3 },
    ])
  })

  it("drops a full slot and counts a partially filled one", () => {
    const existing = [
      { pickupSlot: "2026-10-28T11:00:00.000Z", status: "received" },
      { pickupSlot: "2026-10-28T11:00:00.000Z", status: "paid" },
      { pickupSlot: "2026-10-28T11:00:00.000Z", status: "received" },
      { pickupSlot: "2026-10-28T11:30:00.000Z", status: "paid" },
      // canceled orders don't hold capacity
      { pickupSlot: "2026-10-28T11:30:00.000Z", status: "canceled" },
    ]
    const slots = pickupSlots([rule], 3, existing, range)
    expect(slots).toEqual([{ startTs: "2026-10-28T11:30:00.000Z", endTs: "2026-10-28T12:00:00.000Z", remaining: 2 }])
  })
})

describe("orderLineTotal (6.5)", () => {
  it("adds modifiers to the unit price, times quantity", () => {
    expect(orderLineTotal(1000, [{ priceCents: 200 }, { priceCents: 50 }], 2)).toBe(2500)
    expect(orderLineTotal(1000, [], 1)).toBe(1000)
  })
})
