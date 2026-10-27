import { describe, expect, it } from "vitest"

import { byteUnit } from "@/lib/bytes"

describe("byteUnit", () => {
  it("keeps small sizes in bytes", () => {
    expect(byteUnit(999)).toEqual({ value: 999, unit: "byte" })
  })

  it("moves to the largest unit with one decimal", () => {
    expect(byteUnit(6969)).toEqual({ value: 7, unit: "kilobyte" })
    expect(byteUnit(2_450_000)).toEqual({ value: 2.5, unit: "megabyte" })
    expect(byteUnit(3_000_000_000_000)).toEqual({ value: 3000, unit: "gigabyte" })
  })

  it("never goes negative", () => {
    expect(byteUnit(-5)).toEqual({ value: 0, unit: "byte" })
  })
})
