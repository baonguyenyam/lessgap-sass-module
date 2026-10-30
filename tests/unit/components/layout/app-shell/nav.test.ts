import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

import { flatNavItems, navGroups, type NavAccess } from "@/components/layout/app-shell/nav"
import { roleGrants } from "@/platform/tenancy/permissions"

const ALL_MODULES = [
  "booking",
  "reservations",
  "customers",
  "shop",
  "ordering",
  "quotes",
  "payments",
  "catalog",
  "team",
  "newsletter",
  "chatbot",
  "analytics",
]

const hrefs = (access: Partial<NavAccess> = {}) =>
  flatNavItems(navGroups("dashboard", { showAdmin: false, slug: "acme", ...access })).map((i) => i.href)

const asRole = (role: string, extra: Partial<NavAccess> = {}) =>
  hrefs({ enabledModules: ALL_MODULES, permissions: roleGrants(role), ...extra })

describe("dashboard navigation", () => {
  it("links every tenant page under the tenant, the account under /dashboard", () => {
    expect(hrefs()).toContain("/t/acme/members")
    expect(hrefs()).toContain("/t/acme/orders/board")
    expect(hrefs()).toContain("/dashboard/account")
  })

  it("lists each page once, in search too", () => {
    const all = hrefs()
    expect(new Set(all).size).toBe(all.length)
  })

  it("drops the roles entry when the tenant has no custom roles (task 1.8b)", () => {
    expect(hrefs()).toContain("/t/acme/roles")
    expect(hrefs({ customRoles: false })).not.toContain("/t/acme/roles")
  })

  it("hides a module's pages while the tenant has it off", () => {
    const withoutBooking = hrefs({ enabledModules: ALL_MODULES.filter((m) => m !== "booking") })
    for (const page of ["calendar", "waitlist", "reviews", "sales", "products", "locations", "intake"]) {
      expect(withoutBooking).not.toContain(`/t/acme/${page}`)
    }
    expect(withoutBooking).toContain("/t/acme/customers")
    expect(hrefs({ enabledModules: ALL_MODULES.filter((m) => m !== "payments") })).not.toContain(
      "/t/acme/settings/payments"
    )
  })

  it("keeps the order list but drops the board without the ordering module", () => {
    const pages = hrefs({ enabledModules: ALL_MODULES.filter((m) => m !== "ordering") })
    expect(pages).toContain("/t/acme/orders")
    expect(pages).not.toContain("/t/acme/orders/board")
  })
})

describe("dashboard navigation by role", () => {
  it("gives the owner every tenant page", () => {
    expect(asRole("owner")).toEqual(hrefs({ enabledModules: ALL_MODULES }))
  })

  it("shows staff only what their pages let them open", () => {
    const pages = asRole("staff")
    expect(pages).toEqual(
      expect.arrayContaining(["/t/acme", "/t/acme/calendar", "/t/acme/reviews", "/t/acme/customers"])
    )
    for (const page of ["members", "roles", "billing", "catalog", "team", "payments", "analytics", "settings/site"]) {
      expect(pages).not.toContain(`/t/acme/${page}`)
    }
    // Settings itself and the personal pages under it stay.
    expect(pages).toContain("/t/acme/settings")
    expect(pages).toContain("/t/acme/settings/display")
  })

  it("keeps billing from the manager, who has no billing.manage", () => {
    const pages = asRole("manager")
    expect(pages).toContain("/t/acme/members")
    expect(pages).toContain("/t/acme/settings/site")
    expect(pages).not.toContain("/t/acme/billing")
    expect(pages).not.toContain("/t/acme/payments")
  })

  it("shows a custom role exactly its grants", () => {
    const pages = hrefs({ enabledModules: ALL_MODULES, permissions: ["bookings.view"] })
    expect(pages).toEqual(expect.arrayContaining(["/t/acme/calendar", "/t/acme/reservations", "/t/acme/reviews"]))
    expect(pages).not.toContain("/t/acme/waitlist")
    expect(pages).not.toContain("/t/acme/customers")
  })

  it("links the platform console for staff and the admin panel for ROOT", () => {
    expect(hrefs()).not.toContain("/platform")
    expect(hrefs({ showPlatform: true })).toContain("/platform")
    expect(hrefs({ showAdmin: true })).toContain("/admin")
  })
})

describe("platform console navigation", () => {
  it("links every console page", () => {
    const pages = flatNavItems(navGroups("platform", { showAdmin: false, slug: "" })).map((i) => i.href)
    for (const page of [
      "",
      "/tenants",
      "/plans",
      "/modules",
      "/usage",
      "/domains",
      "/jobs",
      "/emails",
      "/emails/templates",
      "/errors",
      "/backups",
      "/settings",
    ]) {
      expect(pages).toContain(`/platform${page}`)
    }
  })
})
