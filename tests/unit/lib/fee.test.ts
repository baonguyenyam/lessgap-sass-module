import { describe, expect, it } from "vitest"
import { computeApplicationFee, refundFee } from "@/lib/billing/fee"

describe("computeApplicationFee (6.1)", () => {
  it("none takes nothing", () => {
    expect(computeApplicationFee({ model: "none" }, 5000)).toEqual({ fee: 0, metered: false })
  })

  it("percent takes basis points, rounding to the cent", () => {
    expect(computeApplicationFee({ model: "percent", bps: 300 }, 10_000)).toEqual({ fee: 300, metered: false })
    // 2.9% of 1,234¢ = 35.786¢ → 36¢
    expect(computeApplicationFee({ model: "percent", bps: 290 }, 1234)).toEqual({ fee: 36, metered: false })
  })

  it("fixed takes the constant regardless of amount", () => {
    expect(computeApplicationFee({ model: "fixed", fixed: 50 }, 100)).toEqual({ fee: 50, metered: false })
    expect(computeApplicationFee({ model: "fixed", fixed: 50 }, 100_000)).toEqual({ fee: 50, metered: false })
  })

  it("percent_fixed takes both", () => {
    // 2.9% + 30¢ on 10,000¢ = 290 + 30 = 320
    expect(computeApplicationFee({ model: "percent_fixed", bps: 290, fixed: 30 }, 10_000)).toEqual({
      fee: 320,
      metered: false,
    })
  })

  it("percent_capped never takes more than the cap", () => {
    expect(computeApplicationFee({ model: "percent_capped", bps: 500, cap: 400 }, 100_000)).toEqual({
      fee: 400,
      metered: false,
    })
    expect(computeApplicationFee({ model: "percent_capped", bps: 500, cap: 400 }, 1000)).toEqual({
      fee: 50,
      metered: false,
    })
  })

  it("per_booking meters instead of taking a cut", () => {
    expect(computeApplicationFee({ model: "per_booking", fixed: 200 }, 5000)).toEqual({ fee: 0, metered: true })
  })

  it("the fee never exceeds the charge, and is never negative on zero", () => {
    expect(computeApplicationFee({ model: "percent", bps: 20_000 }, 100)).toEqual({ fee: 100, metered: false })
    expect(computeApplicationFee({ model: "percent_fixed", bps: 290, fixed: 30 }, 0)).toEqual({
      fee: 0,
      metered: false,
    })
  })
})

describe("refundFee (6.1)", () => {
  it("returns the fee proportionally", () => {
    // 320¢ fee on 10,000¢; refund 5,000¢ → 160¢
    expect(refundFee(320, 10_000, 5000)).toBe(160)
    // partial: 320 on 10,000; refund 3,300 → 105.6 → 106
    expect(refundFee(320, 10_000, 3300)).toBe(106)
  })

  it("a full refund returns the whole fee; none returns nothing", () => {
    expect(refundFee(320, 10_000, 10_000)).toBe(320)
    expect(refundFee(320, 10_000, 0)).toBe(0)
    expect(refundFee(0, 10_000, 10_000)).toBe(0)
  })
})
