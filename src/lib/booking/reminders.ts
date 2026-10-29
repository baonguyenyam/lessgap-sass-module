import { toDate } from "@/lib/timestamps"

/** Reminder window logic (task 5.7, spec/07): an appointment is due a
 * reminder when its start crosses into a window and that window hasn't
 * fired. `remindedAt` records the last send — a smaller window is due when
 * the last send happened before it. */
export function dueForReminder(
  startTs: string,
  remindedAt: string | null,
  windowsMinutes: number[],
  now: Date
): number | null {
  // startTs/remindedAt arrive as UTC ISO from callers or as the
  // TimestampString "YYYY-MM-DD HH:mm:ss" the column stores — parse both.
  const parse = (v: string) => (v.includes("T") ? new Date(v) : toDate(v))
  const remaining = parse(startTs).getTime() - now.getTime()
  const lastSent = remindedAt ? parse(remindedAt).getTime() : null
  // The smallest due window wins — at 2h-out the 2h reminder fires, not
  // the 24h one again.
  for (const w of [...windowsMinutes].sort((a, b) => a - b)) {
    if (remaining > w * 60_000) continue
    if (lastSent === null) return w
    const lastRemaining = parse(startTs).getTime() - lastSent
    if (lastRemaining > w * 60_000) return w
  }
  return null
}
