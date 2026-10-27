import { describe, expect, it } from "vitest"
import { addMoney, formatMoney } from "@/platform/money"

describe("formatMoney", () => {
  it("formats USD for English", () => {
    expect(formatMoney(12345, "USD", "en-US")).toBe("$123.45")
  })

  it("formats USD for Vietnamese", () => {
    expect(formatMoney(12345, "USD", "vi-VN")).toBe("123,45 US$")
  })

  it("uses the currency's zero fraction digits", () => {
    expect(formatMoney(125000, "VND", "vi-VN")).toBe("125.000 ₫")
  })

  it("refuses amounts outside safe integer minor units", () => {
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 1, "USD", "en-US")).toThrow(RangeError)
  })
})

describe("addMoney", () => {
  it("adds integer minor units", () => {
    expect(addMoney({ amount: 199, currency: "USD" }, { amount: 1, currency: "USD" })).toEqual({
      amount: 200,
      currency: "USD",
    })
  })

  it("rejects different currencies", () => {
    expect(() => addMoney({ amount: 1, currency: "USD" }, { amount: 1, currency: "VND" })).toThrow(
      "Currency codes must match"
    )
  })

  it("rejects an unsafe integer sum", () => {
    expect(() =>
      addMoney({ amount: Number.MAX_SAFE_INTEGER, currency: "USD" }, { amount: 1, currency: "USD" })
    ).toThrow(RangeError)
  })
})
