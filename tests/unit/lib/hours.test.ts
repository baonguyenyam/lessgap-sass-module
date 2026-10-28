import { describe, expect, it } from "vitest"
import { parseHours } from "@/lib/hours"

describe("parseHours", () => {
  it("parses open-close ranges per day and defaults empties to closed", () => {
    expect(parseHours({ mon: "09:00-17:30", tue: "", wed: "closed" })).toEqual({
      mon: "09:00-17:30",
      tue: "closed",
      wed: "closed",
      thu: "closed",
      fri: "closed",
      sat: "closed",
      sun: "closed",
    })
  })

  it("rejects a malformed value", () => {
    expect(parseHours({ mon: "nine-to-five" })).toEqual({ error: "invalid:mon" })
    expect(parseHours({ tue: "09:00" })).toEqual({ error: "invalid:tue" })
    expect(parseHours({ wed: "9:00-17:00-20:00" })).toEqual({ error: "invalid:wed" })
  })

  it("rejects open not before close and out-of-range times", () => {
    expect(parseHours({ mon: "17:00-09:00" })).toEqual({ error: "invalid:mon" })
    expect(parseHours({ mon: "25:00-26:00" })).toEqual({ error: "invalid:mon" })
  })
})
