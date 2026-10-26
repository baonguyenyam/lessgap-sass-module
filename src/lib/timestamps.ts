import type { TimestampString } from "@prisma/orm-postgres/contract-builder"

/**
 * The kit's `timestamp(3)` columns are `TimestampString` values in Prisma 8:
 * "YYYY-MM-DD HH:mm:ss.SSS", UTC by convention, no zone designator. These two
 * functions are the only place that turns them into a `Date` and back.
 *
 * Never `new Date(row.createdAt)`: without a zone designator JavaScript reads
 * the string as local time, and every value is off by the machine's offset.
 */
export function toDate(value: string): Date
export function toDate(value: string | null | undefined): Date | null
export function toDate(value: string | null | undefined): Date | null {
  if (value == null) return null
  return new Date(value.replace(" ", "T") + "Z")
}

/** A `Date` as the column stores it. */
export function toTs(value: Date): TimestampString
export function toTs(value: Date | null | undefined): TimestampString | null
export function toTs(value: Date | null | undefined): TimestampString | null {
  if (value == null) return null
  return value.toISOString().replace("T", " ").slice(0, -1) as TimestampString
}

/** The current instant, ready to write. */
export const nowTs = (): TimestampString => toTs(new Date())
