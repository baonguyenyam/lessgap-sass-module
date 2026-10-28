import { describe, expect, it } from "vitest"

import { cronAuthorization } from "@/platform/jobs/cron-auth"

describe("cronAuthorization (O7)", () => {
  it("refuses everything while CRON_SECRET is unset", () => {
    expect(cronAuthorization("Bearer anything", undefined)).toBe("unconfigured")
    expect(cronAuthorization("Bearer ", " ")).toBe("unconfigured")
  })

  it("accepts only the exact bearer secret", () => {
    expect(cronAuthorization("Bearer s3cret", "s3cret")).toBe("ok")
    expect(cronAuthorization("Bearer s3cret2", "s3cret")).toBe("unauthorized")
    expect(cronAuthorization("s3cret", "s3cret")).toBe("unauthorized")
    expect(cronAuthorization(null, "s3cret")).toBe("unauthorized")
  })
})
