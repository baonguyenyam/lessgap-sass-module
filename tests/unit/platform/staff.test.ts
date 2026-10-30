import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ id: "u1" }) }))
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { requirePlatformRole } = await import("@/platform/staff")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => db.reset())

describe("requirePlatformRole (task 1.10, T10)", () => {
  it("lets a platform staff member through with their role", async () => {
    db.fn("User.first").mockResolvedValue({ platformRole: "SUPPORT", twoFactorEnabled: true })
    await expect(requirePlatformRole()).resolves.toEqual({ user: { id: "u1" }, platformRole: "SUPPORT" })
  })

  it("sends a member without platformRole to the dashboard, and a missing user the same way", async () => {
    db.fn("User.first").mockResolvedValue({ platformRole: null })
    await expect(requirePlatformRole()).rejects.toThrow("REDIRECT:/dashboard")
    db.fn("User.first").mockResolvedValue(null)
    await expect(requirePlatformRole()).rejects.toThrow("REDIRECT:/dashboard")
  })
})
