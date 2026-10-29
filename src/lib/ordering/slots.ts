import { toDate } from "@/lib/timestamps"

/** Pickup slots (task 6.5): a kitchen can take `capacity` orders per slot;
 * `pickupSlots` emits each `slotMinutes` window inside a service period and
 * counts the orders already holding it. */
export type PickupRule = { weekday: number; startMinute: number; endMinute: number; slotMinutes: number }
export type PickupSlot = { startTs: string; endTs: string; remaining: number }

export function pickupSlots(
  rules: PickupRule[],
  capacity: number,
  existing: { pickupSlot: string | null; status: string }[],
  range: { startTs: string; endTs: string }
): PickupSlot[] {
  const parse = (v: string) => (v.includes("T") ? new Date(v) : toDate(v))
  const start = parse(range.startTs)
  const end = parse(range.endTs)
  const out: PickupSlot[] = []
  const day = new Date(start.getTime())
  day.setUTCHours(0, 0, 0, 0)
  while (day.getTime() <= end.getTime()) {
    for (const rule of rules) {
      if (day.getUTCDay() !== rule.weekday) continue
      for (let m = rule.startMinute; m + rule.slotMinutes <= rule.endMinute; m += rule.slotMinutes) {
        const slotStart = new Date(day.getTime() + m * 60_000)
        const slotEnd = new Date(slotStart.getTime() + rule.slotMinutes * 60_000)
        if (slotStart < start || slotStart >= end) continue
        const key = slotStart.toISOString()
        const taken = existing.filter((o) => o.pickupSlot === key && o.status !== "canceled").length
        if (taken < capacity) out.push({ startTs: key, endTs: slotEnd.toISOString(), remaining: capacity - taken })
      }
    }
    day.setTime(day.getTime() + 24 * 3600 * 1000)
  }
  return out
}

/** A line's price: variant price plus its chosen modifiers, × quantity. */
export function orderLineTotal(unitPriceCents: number, modifiers: { priceCents: number }[], quantity: number): number {
  return (unitPriceCents + modifiers.reduce((s, m) => s + m.priceCents, 0)) * quantity
}
