import { beforeEach, describe, expect, it, vi } from "vitest"

const session = vi.fn()
const save = vi.fn()

vi.mock("@/auth", () => ({ auth: { api: { getSession: () => session() } } }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/settings/store", () => ({ saveSettings: (...a: unknown[]) => save(...a) }))

const { savePlatformSettings } = await import("@/app/actions/platform-settings")
const as = (role: string) => session.mockResolvedValue({ user: { id: `${role}-1`, role } })

beforeEach(() => {
  save.mockReset()
  session.mockReset()
})

describe("savePlatformSettings", () => {
  it("refuses a caller who is not signed in", async () => {
    session.mockResolvedValue(null)
    await expect(savePlatformSettings({ "display.page_size": "50" })).rejects.toThrow("Unauthorized")
  })

  it("lets an admin save display settings, parsed", async () => {
    as("ADMIN")
    await expect(
      savePlatformSettings({ "display.page_size": "50", "display.time_zone": "Asia/Ho_Chi_Minh" })
    ).resolves.toEqual({})
    expect(save).toHaveBeenCalledWith({ "display.page_size": 50, "display.time_zone": "Asia/Ho_Chi_Minh" }, "ADMIN-1")
  })

  it("keeps ROOT settings for ROOT, and refuses the whole save", async () => {
    as("ADMIN")
    await expect(savePlatformSettings({ "display.page_size": "50", "signup.enabled": "false" })).resolves.toEqual({
      error: "errors.forbidden",
    })
    expect(save).not.toHaveBeenCalled()

    as("ROOT")
    await expect(savePlatformSettings({ "signup.enabled": "false", "locale.app": "vi" })).resolves.toEqual({})
    expect(save).toHaveBeenCalledWith({ "signup.enabled": false, "locale.app": "vi" }, "ROOT-1")
  })

  it("refuses unknown keys and values that do not parse", async () => {
    as("ROOT")
    await expect(savePlatformSettings({ "no.such": 1 })).resolves.toEqual({ error: "errors.unknown" })
    await expect(savePlatformSettings({ "display.page_size": "7" })).resolves.toEqual({ error: "errors.invalid" })
    expect(save).not.toHaveBeenCalled()
  })
})
