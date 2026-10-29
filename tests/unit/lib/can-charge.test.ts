import { describe, expect, it } from "vitest"
import { canCharge } from "@/platform/payments/connect"

describe("canCharge (6.3)", () => {
  it("is true only when the account can charge", () => {
    expect(canCharge({ chargesEnabled: true })).toBe(true)
    expect(canCharge({ chargesEnabled: false })).toBe(false)
    expect(canCharge({})).toBe(false)
  })
})
