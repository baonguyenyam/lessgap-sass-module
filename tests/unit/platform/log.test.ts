import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sinks = vi.hoisted(() => ({ write: vi.fn(), sentry: vi.fn(), headers: null as Headers | null }))
vi.mock("@/platform/error-report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/platform/error-report")>()),
  writeErrorReport: (...a: unknown[]) => sinks.write(...a),
}))
vi.mock("@/platform/sentry", () => ({ reportToSentry: (...a: unknown[]) => sinks.sentry(...a) }))
vi.mock("next/headers", () => ({
  headers: async () => {
    if (!sinks.headers) throw new Error("outside a request")
    return sinks.headers
  },
}))

const { log } = await import("@/platform/log")

beforeEach(() => {
  sinks.write.mockReset().mockResolvedValue(undefined)
  sinks.sentry.mockReset().mockResolvedValue(undefined)
  sinks.headers = null
})
afterEach(() => vi.restoreAllMocks())

describe("log", () => {
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

  it("writes the error line at once, masked", async () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const done = log.error("platform.action.failed", { error: new Error("failed for user@example.com") })
    expect(output).toHaveBeenCalledWith(
      JSON.stringify({
        level: "error",
        event: "platform.action.failed",
        error: { name: "Error", message: "failed for [address]" },
      })
    )
    await done
  })

  it("records an ErrorReport with the request's id and surface, and reports to Sentry (O4)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    sinks.headers = new Headers({ "x-request-id": "0190f8a2-7b3c-7d4e", "x-request-source": "dashboard" })
    await log.error("platform.action.failed", { error: new Error("boom"), tenantId: "t1" })
    expect(sinks.write).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "0190f8a2-7b3c-7d4e", source: "dashboard", tenantId: "t1", message: "boom" })
    )
    expect(sinks.sentry).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ requestId: "0190f8a2-7b3c-7d4e", tenantId: "t1" })
    )
  })

  it("works outside a request, and a failing sink never breaks the caller", async () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined)
    sinks.write.mockRejectedValue(new Error("db down"))
    await expect(log.error("jobs.run.failed", { source: "job" })).resolves.toBeUndefined()
    expect(sinks.write).toHaveBeenCalledWith(expect.objectContaining({ requestId: null, source: "job" }))
    expect(output.mock.calls.some(([line]) => String(line).includes("platform.log.sink_failed"))).toBe(true)
  })
})
