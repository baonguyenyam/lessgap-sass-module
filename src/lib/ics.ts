/** An RFC 5545 calendar attachment (task 5.4): one VEVENT with UTC times —
 * the confirmation email's `.ics`. */
export function icsFile(input: {
  uid: string
  title: string
  startTs: string
  endTs: string
  location?: string
  description?: string
}): string {
  const stamp = (ts: string) =>
    new Date(ts)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//lessgap//booking//EN",
    "BEGIN:VEVENT",
    `UID:${esc(input.uid)}`,
    `DTSTART:${stamp(input.startTs)}`,
    `DTEND:${stamp(input.endTs)}`,
    `SUMMARY:${esc(input.title)}`,
    ...(input.location ? [`LOCATION:${esc(input.location)}`] : []),
    ...(input.description ? [`DESCRIPTION:${esc(input.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}
