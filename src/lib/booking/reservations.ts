import { toDate } from "@/lib/timestamps"

/** Reservation slot logic (task 5.8, spec/07): a party books a table, not a
 * staff member. `reservationSlots` walks each service-period rule, emits a
 * start every `slotMinutes`, and keeps a table when its capacity fits the
 * party and no existing reservation (plus `turnMinutes` turnover) overlaps. */
export type ReservationRuleInput = {
  weekday: number
  startMinute: number
  endMinute: number
  slotMinutes: number
  turnMinutes: number
  minPartySize: number
  maxPartySize: number
}
export type TableInput = { id: string; capacity: number; area: string }
export type ExistingReservation = { tableId: string | null; startTs: string; endTs: string; status: string }
export type ReservationSlot = { tableId: string; startTs: string; endTs: string }

const overlaps = (a1: Date, a2: Date, b1: Date, b2: Date) => a1 < b2 && b1 < a2

export function reservationSlots(
  rules: ReservationRuleInput[],
  tables: TableInput[],
  existing: ExistingReservation[],
  partySize: number,
  range: { startTs: string; endTs: string }
): ReservationSlot[] {
  const start = toDate(range.startTs.replace("T", " ").replace("Z", "")) ?? new Date(range.startTs)
  const end = toDate(range.endTs.replace("T", " ").replace("Z", "")) ?? new Date(range.endTs)
  const out: ReservationSlot[] = []
  const candidates = tables.filter((t) => t.capacity >= partySize)
  for (const rule of rules) {
    if (partySize < rule.minPartySize || partySize > rule.maxPartySize) continue
    // Walk days in the range; a rule applies to its weekday.
    const day = new Date(start.getTime())
    day.setUTCHours(0, 0, 0, 0)
    while (day.getTime() <= end.getTime()) {
      if (day.getUTCDay() === rule.weekday) {
        for (let m = rule.startMinute; m + rule.slotMinutes <= rule.endMinute; m += rule.slotMinutes) {
          const slotStart = new Date(day.getTime() + m * 60_000)
          const slotEnd = new Date(slotStart.getTime() + rule.slotMinutes * 60_000)
          if (slotStart < start || slotStart >= end) continue
          for (const table of candidates) {
            const busy = existing.some(
              (r) =>
                r.tableId === table.id &&
                r.status !== "canceled" &&
                overlaps(
                  slotStart,
                  slotEnd,
                  new Date(toDate(r.startTs.replace("T", " ").replace("Z", "")).getTime() - rule.turnMinutes * 60_000),
                  new Date(toDate(r.endTs.replace("T", " ").replace("Z", "")).getTime() + rule.turnMinutes * 60_000)
                )
            )
            if (!busy) out.push({ tableId: table.id, startTs: slotStart.toISOString(), endTs: slotEnd.toISOString() })
          }
        }
      }
      day.setTime(day.getTime() + 24 * 3600 * 1000)
    }
  }
  return out
}
