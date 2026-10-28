import { describe, expect, it } from "vitest"

import { dashboardRedirectTarget, tenantPath } from "@/lib/tenant-paths"

describe("tenantPath", () => {
  it("builds /t/<slug> and its pages without stray slashes", () => {
    expect(tenantPath("pho")).toBe("/t/pho")
    expect(tenantPath("pho", "members")).toBe("/t/pho/members")
    expect(tenantPath("pho", "/settings/display/")).toBe("/t/pho/settings/display")
  })
})

describe("dashboardRedirectTarget", () => {
  it("keeps the page and the query string of an old /dashboard URL", () => {
    expect(dashboardRedirectTarget("pho", [], "")).toBe("/t/pho")
    expect(dashboardRedirectTarget("pho", ["billing"], "success=true")).toBe("/t/pho/billing?success=true")
    expect(dashboardRedirectTarget("pho", ["projects", "abc 1"], "")).toBe("/t/pho/projects/abc%201")
  })
})
