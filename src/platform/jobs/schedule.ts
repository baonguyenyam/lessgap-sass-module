/**
 * Five-field cron expressions, in UTC (spec/16-operations.md, "Schedules"):
 * minute, hour, day of month, month, day of week. Each field takes `*`, a
 * number, a range `a-b`, a list `a,b`, and a step `*\/n` or `a-b/n`. Enough for
 * the schedules a module declares; no names, no `L` or `#`.
 */

const FIELDS = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // day of week, Sunday = 0
] as const

export type CronSchedule = { sets: Set<number>[]; anyDay: boolean; anyWeekday: boolean }

function parseField(text: string, min: number, max: number): Set<number> {
  const values = new Set<number>()
  for (const part of text.split(",")) {
    const [range, stepText] = part.split("/")
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step < 1) throw new Error(`invalid step in "${text}"`)
    let [from, to] = [min, max]
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number)
      from = a
      to = b ?? (stepText === undefined ? a : max)
    }
    if (![from, to].every(Number.isInteger) || from < min || to > max || from > to) {
      throw new Error(`"${text}" is outside ${min}-${max}`)
    }
    for (let v = from; v <= to; v += step) values.add(v)
  }
  return values
}

export function parseCron(expression: string): CronSchedule {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`a cron expression has 5 fields, got "${expression}"`)
  return {
    sets: parts.map((part, i) => parseField(part, FIELDS[i].min, FIELDS[i].max)),
    anyDay: parts[2] === "*",
    anyWeekday: parts[4] === "*",
  }
}

/**
 * The first minute strictly after `after` that the expression matches. As in
 * classic cron, when both day fields are restricted a day matches either.
 */
export function nextRun(expression: string, after: Date): Date {
  const { sets, anyDay, anyWeekday } = parseCron(expression)
  const [minutes, hours, days, months, weekdays] = sets
  const t = new Date(after.getTime())
  t.setUTCSeconds(0, 0)
  t.setUTCMinutes(t.getUTCMinutes() + 1)
  // Four years of minutes is more than any valid expression needs to recur.
  for (let i = 0; i < 4 * 366 * 24 * 60; i++) {
    const dayOk =
      anyDay && anyWeekday
        ? true
        : anyDay
          ? weekdays.has(t.getUTCDay())
          : anyWeekday
            ? days.has(t.getUTCDate())
            : days.has(t.getUTCDate()) || weekdays.has(t.getUTCDay())
    if (!months.has(t.getUTCMonth() + 1) || !dayOk) {
      t.setUTCDate(t.getUTCDate() + 1)
      t.setUTCHours(0, 0, 0, 0)
      continue
    }
    if (!hours.has(t.getUTCHours())) {
      t.setUTCHours(t.getUTCHours() + 1, 0, 0, 0)
      continue
    }
    if (minutes.has(t.getUTCMinutes())) return t
    t.setUTCMinutes(t.getUTCMinutes() + 1)
  }
  throw new Error(`"${expression}" never matches`)
}

/** Minutes to wait before attempt `attempt + 1`: 1, 2, 4, 8… capped at an hour. */
export function backoffMinutes(attempt: number): number {
  return Math.min(60, 2 ** Math.max(0, attempt - 1))
}
