import { describe, expect, it } from "vitest"

import { buildErrorReport, describeError, errorDigest, firstStackFrame } from "@/platform/error-report"

const stack = (frame: string) => `TypeError: boom\n    at ${frame}\n    at next (node:internal/x:1:1)`

describe("ErrorReport grouping (O4)", () => {
  it("gives the same bug from the same place one digest, across messages and columns", () => {
    const a = new TypeError("failed for a@example.test")
    a.stack = stack("save (src/app/actions/x.ts:10:5)")
    const b = new TypeError("failed for b@example.test")
    b.stack = stack("save (src/app/actions/x.ts:10:17)")
    const one = buildErrorReport({ error: a, event: "e", source: "dashboard" })
    const two = buildErrorReport({ error: b, event: "e", source: "dashboard" })
    expect(one.digest).toBe(two.digest)
  })

  it("separates surfaces, error names and places", () => {
    const frame = "save (src/x.ts:1:1)"
    expect(errorDigest("dashboard", "TypeError", frame)).not.toBe(errorDigest("api", "TypeError", frame))
    expect(errorDigest("api", "TypeError", frame)).not.toBe(errorDigest("api", "RangeError", frame))
    expect(errorDigest("api", "TypeError", frame)).not.toBe(errorDigest("api", "TypeError", "load (src/y.ts:1:1)"))
  })

  it("masks addresses and carries the request id and tenant", () => {
    const report = buildErrorReport({
      error: new Error("could not mail person@example.com"),
      event: "billing.mail.failed",
      source: "api",
      requestId: "0190f8a2-7b3c",
      tenantId: "t1",
    })
    expect(report).toMatchObject({ message: "could not mail [address]", requestId: "0190f8a2-7b3c", tenantId: "t1" })
  })

  it("places a thrown value or a bare event by its event name", () => {
    expect(describeError("plain string")).toEqual({ name: "NonError", message: "plain string" })
    const report = buildErrorReport({ error: undefined, event: "jobs.run.failed", source: "job" })
    expect(report.message).toBe("jobs.run.failed")
    expect(report.digest).toBe(buildErrorReport({ error: undefined, event: "jobs.run.failed", source: "job" }).digest)
  })

  it("reads the first frame without its column", () => {
    expect(firstStackFrame(stack("save (src/x.ts:10:5)"))).toBe("at save (src/x.ts:10")
    expect(firstStackFrame(undefined)).toBe("")
  })
})
