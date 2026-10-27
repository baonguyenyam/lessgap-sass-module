import { afterEach, describe, expect, it, vi } from "vitest"
import { log } from "@/platform/log"

describe("log", () => {
  afterEach(() => vi.restoreAllMocks())

  it("masks email addresses and sensitive fields in structured info logs", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined)

    log.info("booking.appointment.confirmed", {
      tenantId: "tenant-1",
      note: "sent to person@example.com",
      accessToken: "private-token",
      enabled: true,
      counts: [1, 2],
    })

    expect(output).toHaveBeenCalledWith(
      JSON.stringify({
        level: "info",
        event: "booking.appointment.confirmed",
        tenantId: "tenant-1",
        note: "sent to [address]",
        accessToken: "[redacted]",
        enabled: true,
        counts: [1, 2],
      })
    )
  })

  it("records errors through the error level", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined)

    log.error("platform.action.failed", { error: new Error("failed for user@example.com") })

    expect(output).toHaveBeenCalledWith(
      JSON.stringify({
        level: "error",
        event: "platform.action.failed",
        error: { name: "Error", message: "failed for [address]" },
      })
    )
  })
})
