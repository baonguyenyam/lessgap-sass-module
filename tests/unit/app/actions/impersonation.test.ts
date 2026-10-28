import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const api = { impersonateStart: vi.fn(), switchAsStop: vi.fn() }
const staff = { user: { id: "staff-1" }, platformRole: "SUPPORT" as string }
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock("@/auth", () => ({ auth: { api } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }))
vi.mock("@/platform/staff", () => ({ requirePlatformRole: async () => staff }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { startImpersonation, stopImpersonation } = await import("@/app/actions/impersonation")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  api.impersonateStart.mockReset()
  api.switchAsStop.mockReset()
  staff.platformRole = "SUPPORT"
  db.fn("Tenant.first").mockResolvedValue({ id: "t1", slug: "rosy", status: "ACTIVE" })
})

describe("startImpersonation (task 1.11)", () => {
  it("requires a written reason", async () => {
    await expect(startImpersonation({ tenantId: "t1" })).resolves.toEqual({ error: "reasonRequired" })
    await expect(startImpersonation({ tenantId: "t1", reason: "  " })).resolves.toEqual({ error: "reasonRequired" })
    expect(api.impersonateStart).not.toHaveBeenCalled()
  })

  it("refuses a designer and a suspended tenant", async () => {
    staff.platformRole = "DESIGNER"
    await expect(startImpersonation({ tenantId: "t1", reason: "support ticket" })).resolves.toEqual({
      error: "forbidden",
    })
    staff.platformRole = "ADMIN"
    db.fn("Tenant.first").mockResolvedValue({ id: "t1", slug: "rosy", status: "SUSPENDED" })
    await expect(startImpersonation({ tenantId: "t1", reason: "why" })).resolves.toEqual({ error: "notFound" })
    expect(api.impersonateStart).not.toHaveBeenCalled()
  })

  it("opens the tenant as its owner for support and admin", async () => {
    await expect(startImpersonation({ tenantId: "t1", reason: "helping onboard" })).rejects.toThrow("REDIRECT:/t/rosy")
    expect(api.impersonateStart).toHaveBeenCalledWith(
      expect.objectContaining({ body: { tenantId: "t1", reason: "helping onboard" } })
    )
  })
})

describe("stopImpersonation", () => {
  it("ends the switched session and lands on the console", async () => {
    await expect(stopImpersonation()).rejects.toThrow("REDIRECT:/platform/tenants")
    expect(api.switchAsStop).toHaveBeenCalledOnce()
  })
})
