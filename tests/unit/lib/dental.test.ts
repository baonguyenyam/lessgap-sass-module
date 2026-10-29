import { describe, expect, it } from "vitest"
import { bookingInputError } from "@/lib/booking/dental"

describe("dental PHI guard (5.9)", () => {
  it("a dental tenant's booking refuses free-text notes", () => {
    expect(bookingInputError({ notes: "my tooth hurts" }, "dental")).toBe("invalid_input")
    expect(bookingInputError({ notes: "" }, "dental")).toBeNull()
    expect(bookingInputError({}, "dental")).toBeNull()
  })

  it("other verticals keep notes", () => {
    expect(bookingInputError({ notes: "please trim the ends" }, "nail_salon")).toBeNull()
    expect(bookingInputError({ notes: "x" }, "generic")).toBeNull()
  })
})
