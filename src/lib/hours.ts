/** Opening hours — `{ mon: "09:00-17:00" }` per day, `closed` for a day off. */
const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
export type Hours = Partial<Record<(typeof DAYS)[number], string | "closed">>

/** A day's value is `"HH:MM-HH:MM"` (open before close) or `"closed"`. */
export function parseHours(input: Record<string, string>): Hours | { error: string } {
  const out: Hours = {}
  for (const day of DAYS) {
    const value = (input[day] ?? "").trim()
    if (!value || value === "closed") {
      out[day] = "closed"
      continue
    }
    const [open, close, extra] = value.split("-").map((s) => s.trim())
    if (extra !== undefined || !HHMM.test(open) || !HHMM.test(close) || open >= close) {
      return { error: `invalid:${day}` }
    }
    out[day] = `${open}-${close}`
  }
  return out
}
