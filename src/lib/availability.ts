/**
 * The availability engine (task 5.1, spec/07): a pure function.
 * `availableSlots(rules, timeOff, appointments, service, staff, range, tz)`
 * produces the bookable slots in a tenant's IANA timezone — weekly rules
 * generate candidates; timeOff, existing appointments (with buffers), a
 * minimum notice and a maximum advance remove them. All times out are UTC
 * ISO strings; the database keeps them as `TimestampString` instants.
 */

export type WeeklyRule = {
  /** 0 = Sunday … 6 = Saturday, in the tenant's timezone. */
  weekday: number
  /** Local minutes since midnight the rule opens. */
  startMinute: number
  /** Local minutes since midnight the rule closes — the last slot must end by this. */
  endMinute: number
  /** Whose shift this is; a rule may name a staff member, a resource or both. */
  staffId?: string | null
  resourceId?: string | null
}

export type TimeOff = {
  staffId?: string | null
  resourceId?: string | null
  /** UTC ISO instants. */
  startTs: string
  endTs: string
}

export type ExistingAppointment = {
  staffId?: string | null
  resourceId?: string | null
  startTs: string
  endTs: string
  bufferBeforeMinutes?: number
  bufferAfterMinutes?: number
  /** "canceled" (and anything not blocking) is ignored. */
  status?: string
}

export type ServiceSpec = {
  durationMinutes: number
  bufferBeforeMinutes?: number
  bufferAfterMinutes?: number
}

export type Range = { startTs: string; endTs: string }

export type Slot = {
  staffId: string
  startTs: string
  endTs: string
}

export type AvailabilityOptions = {
  /** Earliest a booking may start, minutes after `range.startTs`. */
  minNoticeMinutes?: number
  /** Furthest a booking may end, minutes after `range.startTs`. */
  maxAdvanceMinutes?: number
  /** Slot granularity — defaults to 15. */
  stepMinutes?: number
}

const MIN = 60_000

/** The local timezone offset (ms east of UTC) at an instant — `Intl` knows
 * every transition, including DST gaps and repeats. */
function offsetMs(tz: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return (
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - instant.getTime()
  )
}

/** Convert a local wall time ("YYYY-MM-DD" + local minutes) in `tz` to the
 * UTC instant. Two offset passes handle the days where the wall clock jumps
 * (spring-forward/fall-back). A wall time inside a DST gap maps to the
 * start of the gap — callers treat that slot as non-existent because the
 * next step lands past it. */
export function wallToUtc(dateStr: string, minuteOfDay: number, tz: string): Date {
  // t = wall - offset(t): iterate toward the fixed point; two passes handle
  // the days where the offset changes inside the rule's span.
  const wall = Date.parse(`${dateStr}T00:00:00Z`) + minuteOfDay * MIN
  let guess = wall - offsetMs(tz, new Date(wall))
  for (let i = 0; i < 3; i++) {
    guess = wall - offsetMs(tz, new Date(guess))
  }
  return new Date(guess)
}

/** The local date (`YYYY-MM-DD`) an instant falls on in `tz`. */
export function localDate(instant: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}`
}

/** Local minutes-since-midnight of an instant in `tz` — how a candidate
 * slot's wall clock reads to the customer. */
export function localMinutesOfDay(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return get("hour") * 60 + get("minute")
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** The local weekday (0 = Sunday) an instant falls on in `tz`. */
export function localWeekday(instant: Date, tz: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(instant)
  return WEEKDAYS.indexOf(name)
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Every date (`YYYY-MM-DD`) covered by `range` in `tz`. */
function daysIn(range: Range, tz: string): string[] {
  const out: string[] = []
  let d = localDate(new Date(range.startTs), tz)
  const last = localDate(new Date(range.endTs), tz)
  // Step a full 24h from local noon — noon never sits inside a DST gap, and
  // one step always lands inside the next local day in any zone.
  while (d <= last) {
    out.push(d)
    d = localDate(new Date(wallToUtc(d, 12 * 60, tz).getTime() + 24 * 3600 * 1000), tz)
  }
  return out
}

function weekdayOfDate(dateStr: string, tz: string): number {
  return localWeekday(wallToUtc(dateStr, 12 * 60, tz), tz)
}

export function availableSlots(
  rules: WeeklyRule[],
  timeOff: TimeOff[],
  appointments: ExistingAppointment[],
  service: ServiceSpec,
  staff: string | "any" | undefined,
  range: Range,
  tz: string,
  options: AvailabilityOptions = {}
): Slot[] {
  const step = (options.stepMinutes ?? 15) * MIN
  const dur = service.durationMinutes * MIN
  const bufB = (service.bufferBeforeMinutes ?? 0) * MIN
  const bufA = (service.bufferAfterMinutes ?? 0) * MIN
  const minNotice = (options.minNoticeMinutes ?? 0) * MIN
  const maxAdvance = options.maxAdvanceMinutes
  const rangeStart = new Date(range.startTs).getTime()
  const rangeEnd = new Date(range.endTs).getTime()
  const earliest = rangeStart + minNotice

  const blockers = appointments.filter((a) => a.status !== "canceled")
  const off = timeOff

  const candidates: Slot[] = []
  for (const date of daysIn(range, tz)) {
    const weekday = weekdayOfDate(date, tz)
    for (const rule of rules) {
      if (rule.weekday !== weekday || !rule.staffId) continue
      if (staff && staff !== "any" && rule.staffId !== staff) continue
      const open = wallToUtc(date, rule.startMinute, tz).getTime()
      const close = wallToUtc(date, rule.endMinute, tz).getTime()
      for (let start = open; start + dur <= close; start += step) {
        const end = start + dur
        if (start < earliest || start >= rangeEnd) continue
        // A candidate's wall time must sit inside the rule — a slot an
        // instant-stepping produced inside a DST gap does not exist on the
        // customer's clock and must not be offered.
        const wallStart = localMinutesOfDay(new Date(start), tz)
        if (wallStart < rule.startMinute || wallStart >= rule.endMinute) continue
        if (maxAdvance && start > rangeStart + maxAdvance * MIN) continue
        const staffOff = off.some(
          (t) =>
            (t.staffId === rule.staffId ||
              t.staffId == null ||
              (rule.resourceId && t.resourceId === rule.resourceId)) &&
            overlaps(start, end, new Date(t.startTs).getTime(), new Date(t.endTs).getTime())
        )
        if (staffOff) continue
        // Two appointments clash when one's busy window (buffers included)
        // touches the other's actual time — buffer-against-buffer is fine.
        const clash = blockers.some((a) => {
          if (a.staffId !== rule.staffId && !(rule.resourceId && a.resourceId === rule.resourceId)) return false
          const aStart = new Date(a.startTs).getTime()
          const aEnd = new Date(a.endTs).getTime()
          const aBusyStart = aStart - (a.bufferBeforeMinutes ?? 0) * MIN
          const aBusyEnd = aEnd + (a.bufferAfterMinutes ?? 0) * MIN
          return overlaps(start, end, aBusyStart, aBusyEnd) || overlaps(start - bufB, end + bufA, aStart, aEnd)
        })
        if (clash) continue
        candidates.push({
          staffId: rule.staffId,
          startTs: new Date(start).toISOString(),
          endTs: new Date(end).toISOString(),
        })
      }
    }
  }

  if (!staff || staff === "any") {
    // "Any staff": one slot per start time — the staff with the fewest
    // existing appointments in range (keeps the load even).
    const counts = new Map<string, number>()
    for (const a of blockers) {
      if (a.staffId) counts.set(a.staffId, (counts.get(a.staffId) ?? 0) + 1)
    }
    const byStart = new Map<string, Slot[]>()
    for (const s of candidates) {
      const list = byStart.get(s.startTs) ?? []
      list.push(s)
      byStart.set(s.startTs, list)
    }
    return [...byStart.values()]
      .map((list) => list.sort((a, b) => (counts.get(a.staffId) ?? 0) - (counts.get(b.staffId) ?? 0))[0])
      .sort((a, b) => a.startTs.localeCompare(b.startTs))
  }
  return candidates.sort((a, b) => a.startTs.localeCompare(b.startTs))
}
