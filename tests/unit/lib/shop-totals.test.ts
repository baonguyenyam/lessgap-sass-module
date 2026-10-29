import { describe, expect, it } from "vitest"
import { cartTotal, orderTotal } from "@/lib/shop/totals"

describe("shop totals (6.4)", () => {
  it("a cart totals price × quantity", () => {
    expect(
      cartTotal([
        { quantity: 2, unitPriceCents: 500 },
        { quantity: 1, unitPriceCents: 300 },
      ])
    ).toBe(1300)
    expect(cartTotal([])).toBe(0)
  })
  it("shipping adds its flat rate; pickup adds nothing", () => {
    expect(orderTotal(1300, "shipping", 500)).toBe(1800)
    expect(orderTotal(1300, "pickup", 500)).toBe(1300)
    expect(orderTotal(1300, "shipping", null)).toBe(1300)
  })
})
