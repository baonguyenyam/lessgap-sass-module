import { describe, expect, it } from "vitest"
import { signManageToken, verifyManageToken } from "@/lib/booking/manage-token"

describe("manage token (5.4)", () => {
  it("signs and verifies a token", () => {
    const token = signManageToken("appt-1")
    expect(verifyManageToken(token)).toEqual({ appointmentId: "appt-1" })
  })

  it("rejects a forged token and an expired one", () => {
    const token = signManageToken("appt-1")
    expect(verifyManageToken(`${token}x`)).toBeNull()
    expect(verifyManageToken(signManageToken("appt-1", Date.now() - 1000))).toBeNull()
    expect(verifyManageToken("garbage")).toBeNull()
  })
})
