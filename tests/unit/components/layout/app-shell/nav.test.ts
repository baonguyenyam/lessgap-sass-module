import { describe, expect, it } from "vitest"
import { navGroups } from "@/components/layout/app-shell/nav"

const hrefs = (customRoles?: boolean) =>
  navGroups("dashboard", { showAdmin: false, slug: "acme", customRoles }).flatMap((g) => g.items.map((i) => i.href))

describe("dashboard navigation", () => {
  it("links every tenant page under the tenant, the account under /dashboard", () => {
    expect(hrefs()).toContain("/t/acme/members")
    expect(hrefs()).toContain("/dashboard/account")
  })

  it("drops the roles entry when the tenant has no custom roles (task 1.8b)", () => {
    expect(hrefs()).toContain("/t/acme/roles")
    expect(hrefs(false)).not.toContain("/t/acme/roles")
  })
})
