import { describe, expect, it, vi, beforeEach } from "vitest"

const session = vi.fn()
const start = vi.fn()
const stop = vi.fn()
const findUser = vi.fn()
const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: () => session(),
      switchAsStart: (...args: unknown[]) => start(...args),
      switchAsStop: (...args: unknown[]) => stop(...args),
    },
  },
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }))
vi.mock("@/lib/db8", () => ({
  db8: { orm: { public: { User: { select: () => ({ where: () => ({ first: () => findUser() }) }) } } } },
}))

const { startSwitchAs, stopSwitchAs } = await import("@/app/actions/switch-as")

const signedIn = (role: string, switchedBy: string | null = null) =>
  session.mockResolvedValue({ user: { id: "root-1", role }, session: { switchedBy } })

beforeEach(() => {
  session.mockReset()
  start.mockReset()
  stop.mockReset()
  findUser.mockReset()
  redirect.mockClear()
  findUser.mockResolvedValue({ id: "u1", role: "USER" })
})

describe("startSwitchAs", () => {
  it("refuses a caller who is not signed in", async () => {
    session.mockResolvedValue(null)
    await expect(startSwitchAs("u1")).rejects.toThrow("Unauthorized")
    expect(start).not.toHaveBeenCalled()
  })

  it("refuses admins and users", async () => {
    for (const role of ["USER", "ADMIN"]) {
      signedIn(role)
      await expect(startSwitchAs("u1")).rejects.toThrow(/not allowed/)
    }
    expect(start).not.toHaveBeenCalled()
  })

  it("refuses a ROOT target and a chained switch", async () => {
    signedIn("ROOT")
    findUser.mockResolvedValue({ id: "r2", role: "ROOT" })
    await expect(startSwitchAs("r2")).rejects.toThrow(/not allowed/)

    signedIn("ROOT", "root-0")
    findUser.mockResolvedValue({ id: "u1", role: "USER" })
    await expect(startSwitchAs("u1")).rejects.toThrow(/not allowed/)
    expect(start).not.toHaveBeenCalled()
  })

  it("refuses an unknown user", async () => {
    signedIn("ROOT")
    findUser.mockResolvedValue(null)
    await expect(startSwitchAs("nobody")).rejects.toThrow(/not found/)
  })

  it("lets ROOT switch to a user and lands on the dashboard", async () => {
    signedIn("ROOT")
    await expect(startSwitchAs("u1")).rejects.toThrow("REDIRECT:/dashboard")
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ body: { userId: "u1" } }))
  })
})

describe("stopSwitchAs", () => {
  it("does nothing outside a Switch As session", async () => {
    signedIn("USER")
    await expect(stopSwitchAs()).rejects.toThrow("REDIRECT:/dashboard")
    expect(stop).not.toHaveBeenCalled()
  })

  it("returns ROOT to the admin panel", async () => {
    signedIn("USER", "root-1")
    stop.mockResolvedValue({ restored: true })
    await expect(stopSwitchAs()).rejects.toThrow("REDIRECT:/admin")
  })

  it("sends the browser to sign-in when the ROOT session is gone", async () => {
    signedIn("USER", "root-1")
    stop.mockResolvedValue({ restored: false })
    await expect(stopSwitchAs()).rejects.toThrow("REDIRECT:/login")
  })
})
