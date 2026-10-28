import { describe, expect, it } from "vitest"

import { acceptRequestId, sourceForPath, tenantSlugFromPath } from "@/platform/request-context"

describe("acceptRequestId", () => {
  it("keeps an upstream id that looks like one", () => {
    expect(acceptRequestId("0190f8a2-7b3c-7d4e-9f00-112233445566")).toBe("0190f8a2-7b3c-7d4e-9f00-112233445566")
  })

  it("refuses anything that could carry text into a log", () => {
    for (const value of [null, "", "short", "a b c d e f g h", "x".repeat(129), "id\nInjected: yes"]) {
      expect(acceptRequestId(value)).toBeNull()
    }
  })
})

describe("sourceForPath", () => {
  it("names the surface of each area", () => {
    expect(sourceForPath("/")).toBe("marketing")
    expect(sourceForPath("/vi/pricing")).toBe("marketing")
    expect(sourceForPath("/dashboard/projects")).toBe("dashboard")
    expect(sourceForPath("/login")).toBe("dashboard")
    expect(sourceForPath("/admin/database")).toBe("platform")
    expect(sourceForPath("/api/health")).toBe("api")
    expect(sourceForPath("/api/cron/reset-demo")).toBe("cron")
  })

  it("matches whole segments only", () => {
    expect(sourceForPath("/administration")).toBe("marketing")
  })
})

describe("tenantSlugFromPath", () => {
  it("reads the slug of a tenant dashboard path", () => {
    expect(tenantSlugFromPath("/t/pho-ha-noi")).toBe("pho-ha-noi")
    expect(tenantSlugFromPath("/t/pho/members")).toBe("pho")
  })

  it("finds none anywhere else, or in a slug that could not exist", () => {
    for (const path of ["/t", "/t/", "/terms", "/dashboard", "/t/Pho", "/t/..%2f"])
      expect(tenantSlugFromPath(path)).toBeNull()
  })
})
