import { describe, expect, it } from "vitest"
import { icsFile } from "@/lib/ics"

describe("ics file (5.4)", () => {
  it("produces a valid VEVENT with UTC times", () => {
    const ics = icsFile({
      uid: "appt-1",
      title: "Manicure; with, extras",
      startTs: "2027-03-14T14:00:00Z",
      endTs: "2027-03-14T15:00:00Z",
      location: "1 Main St",
    })
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("UID:appt-1")
    expect(ics).toContain("DTSTART:20270314T140000Z")
    expect(ics).toContain("DTEND:20270314T150000Z")
    expect(ics).toContain("SUMMARY:Manicure\\; with\\, extras")
    expect(ics).toContain("END:VCALENDAR")
  })
})
