import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Db8Mock } from "@/test/db8-mock"

const session = vi.fn()

// The library moved: what used to be `auth()` is `auth.api.getSession()`.
// Only the shape of the mock changes. Every assertion below is the one the
// 1.7 suite made, because the boundary still returns the same five fields.
vi.mock("@/auth", () => ({ auth: { api: { getSession: () => session() } } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("@/lib/db8", async () => (await import("@/test/db8-mock")).createDb8Mock())
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { setUserRole } = await import("./admin")
const db = (await import("@/lib/db8")) as unknown as Db8Mock
const updateMany = db.fn("User.updateAndCount")

// Only ROOT changes roles (spec/adr/0014-root-role.md).
const asRoot = () => session.mockResolvedValue({ user: { id: "root-1", role: "ROOT" } })

beforeEach(() => {
  session.mockReset()
  db.reset()
  updateMany.mockResolvedValue(1)
})

describe("setUserRole", () => {
  it("refuses a caller who is not signed in", async () => {
    session.mockResolvedValue(null)
    await expect(setUserRole("u1", "ADMIN", "USER")).rejects.toThrow("Unauthorized")
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("refuses a signed-in caller who is not ROOT, admins included", async () => {
    for (const role of ["USER", "ADMIN"]) {
      session.mockResolvedValue({ user: { id: "u2", role } })
      await expect(setUserRole("u1", "ADMIN", "USER")).rejects.toThrow("Unauthorized")
    }
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("never grants or removes ROOT", async () => {
    asRoot()
    await expect(setUserRole("u1", "ROOT", "ADMIN")).rejects.toThrow(/not allowed/)
    await expect(setUserRole("r2", "USER", "ROOT")).rejects.toThrow(/not allowed/)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("refuses a change to the caller's own role", async () => {
    asRoot()
    await expect(setUserRole("root-1", "USER", "ADMIN")).rejects.toThrow(/not allowed/)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("promotes when the row still holds the role the admin was looking at", async () => {
    asRoot()
    await expect(setUserRole("u1", "ADMIN", "USER")).resolves.toEqual({ role: "ADMIN" })
    expect(db.call("User.updateAndCount")).toMatchObject({
      chain: [["where", [{ id: "u1", role: "USER" }]]],
      args: [{ role: "ADMIN" }],
    })
  })

  /**
   * The defect this replaced: the action used to read the current role and
   * flip it. A page rendered before someone else promoted the same user still
   * showed "Make Admin", and clicking it demoted them, with a toast that said
   * "User promoted to USER".
   */
  it("refuses instead of demoting when the role moved under a stale page", async () => {
    asRoot()
    updateMany.mockResolvedValue(0)
    await expect(setUserRole("u1", "ADMIN", "USER")).rejects.toThrow(/changed since/)
  })

  it("refuses a request that would not change anything", async () => {
    asRoot()
    await expect(setUserRole("u1", "ADMIN", "ADMIN")).rejects.toThrow(/already set/)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("never writes a role the caller did not ask for", async () => {
    // The role written comes from the argument, never from what the row holds:
    // that is the whole difference from the toggle this replaced.
    asRoot()
    await setUserRole("u1", "USER", "ADMIN")
    expect(db.call("User.updateAndCount")).toMatchObject({
      chain: [["where", [{ id: "u1", role: "ADMIN" }]]],
      args: [{ role: "USER" }],
    })
  })
})
