import { describe, expect, it, vi, beforeEach } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const session = vi.fn()

// The library moved: what used to be `auth()` is `auth.api.getSession()`.
// Only the shape of the mock changes. Every assertion below is the one the
// 1.7 suite made, because the boundary still returns the same five fields.
vi.mock("@/auth", () => ({ auth: { api: { getSession: () => session() } } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))

const { setUserRole, setUserRoles, updateUser } = await import("@/app/actions/admin")
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

describe("updateUser", () => {
  it("refuses a caller who is not ROOT, admins included", async () => {
    for (const role of ["USER", "ADMIN"]) {
      session.mockResolvedValue({ user: { id: "u2", role } })
      await expect(updateUser("u1", { name: "Ada" })).rejects.toThrow("Unauthorized")
    }
  })

  it("parses the form again on the server", async () => {
    asRoot()
    await expect(updateUser("u1", { name: "   " })).resolves.toEqual({ error: "nameRequired" })
    await expect(updateUser("u1", { name: "x".repeat(51) })).resolves.toEqual({ error: "nameTooLong" })
    expect(db.call("User.update")).toBeUndefined()
  })

  it("saves a trimmed name", async () => {
    asRoot()
    db.fn("User.update").mockResolvedValue({ id: "u1" })
    await expect(updateUser("u1", { name: "  Ada  " })).resolves.toEqual({})
    expect(db.call("User.update")).toMatchObject({ chain: [["where", [{ id: "u1" }]]], args: [{ name: "Ada" }] })
  })
})

describe("setUserRoles", () => {
  it("is ROOT only", async () => {
    session.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } })
    await expect(setUserRoles(["u1"], "ADMIN")).rejects.toThrow("Unauthorized")
  })

  it("skips ROOT accounts and the caller, and changes the rest", async () => {
    asRoot()
    db.fn("User.all").mockResolvedValue([
      { id: "u1", role: "USER" },
      { id: "r2", role: "ROOT" },
    ])
    updateMany.mockResolvedValue(1)
    await expect(setUserRoles(["u1", "r2", "root-1"], "ADMIN")).resolves.toEqual({ changed: 1 })
  })

  it("changes nothing when no one is eligible", async () => {
    asRoot()
    db.fn("User.all").mockResolvedValue([{ id: "r2", role: "ROOT" }])
    await expect(setUserRoles(["r2"], "USER")).resolves.toEqual({ changed: 0 })
    expect(db.call("User.updateAndCount")).toBeUndefined()
  })
})
