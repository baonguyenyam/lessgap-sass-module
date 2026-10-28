import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const rows = vi.fn()
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
vi.mock("@/platform/settings/store", () => ({ getPlatformSettings: async () => ({ "locale.app": "en" }) }))
vi.mock("@/platform/settings/tenant-store", () => ({ getUserSettingRows: (...a: unknown[]) => rows(...a) }))

const db = (await import("@/lib/db8")) as unknown as Db8Mock
const { recipientLocale } = await import("@/lib/email-locale")

beforeEach(() => {
  db.reset()
  rows.mockReset().mockResolvedValue([])
})

describe("recipientLocale", () => {
  it("writes to a member in the language they saved", async () => {
    db.fn("User.first").mockResolvedValue({ id: "u1" })
    rows.mockResolvedValue([{ key: "locale.app", value: "vi" }])
    expect(await recipientLocale(" Member@Example.test ")).toBe("vi")
    expect(db.call("User.first")?.chain).toContainEqual(["where", [{ email: "member@example.test" }]])
    expect(rows).toHaveBeenCalledWith("u1")
  })

  it("uses the platform default for a stranger or an unknown saved value", async () => {
    db.fn("User.first").mockResolvedValue(null)
    expect(await recipientLocale("someone@example.test")).toBe("en")

    db.fn("User.first").mockResolvedValue({ id: "u1" })
    rows.mockResolvedValue([{ key: "locale.app", value: "it" }])
    expect(await recipientLocale("member@example.test")).toBe("en")
  })

  it("never stops an email over a failed lookup", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    db.fn("User.first").mockRejectedValue(new Error("db down"))
    expect(await recipientLocale("member@example.test")).toBe("en")
  })
})
