import { Temporal } from "@js-temporal/polyfill"

export type Disambiguation = "compatible" | "earlier" | "later" | "reject"

/** Resolves a tenant wall-clock date and time to its UTC instant explicitly across DST changes. */
export function resolveLocalDateTime(
  date: string,
  time: string,
  timeZone: string,
  disambiguation: Disambiguation = "reject"
): string {
  return Temporal.PlainDateTime.from(`${date}T${time}`)
    .toZonedDateTime(timeZone, { disambiguation })
    .toInstant()
    .toString()
}

/** Formats a stored UTC instant in the tenant or viewer's time zone. */
export function formatInstant(instant: string, timeZone: string, locale: string): string {
  const zoned = Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone)
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(Number(zoned.epochMilliseconds)))
}
