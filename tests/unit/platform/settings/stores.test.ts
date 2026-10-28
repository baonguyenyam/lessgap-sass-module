import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

// The stores cache their reads with "use cache" (spec/adr/0022). Outside Next
// the directive does nothing, so these tests check what the stores tell the
// cache: which tag each read carries and which tag each save expires.
const cacheApi = vi.hoisted(() => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), updateTag: vi.fn() }))
vi.mock("next/cache", () => cacheApi)
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => null }))
vi.mock("@/platform/tenancy/require-member", () => ({ getMembership: async () => null }))
// Task 1.5: tenant settings are read through the platform client and written
// through tenantDb; both stand on the same db8 stand-in here.
vi.mock("@/platform/db", async () => ({ platformDb: (await import("@/lib/db8")).db8 }))
vi.mock("@/platform/tenancy/tenant-db", async () => {
  const { db8 } = await import("@/lib/db8")
  return {
    tenantDb: (_ctx: unknown, fn: (db: unknown) => unknown) => fn({ TenantSetting: db8.orm.public.TenantSetting }),
  }
})

const db = (await import("@/lib/db8")) as unknown as Db8Mock
const { getPlatformSettings, saveSettings } = await import("@/platform/settings/store")
const { getTenantSettings, getUserSettingRows, saveTenantSettings, saveUserSettings } =
  await import("@/platform/settings/tenant-store")

beforeEach(() => {
  db.reset()
  Object.values(cacheApi).forEach((f) => f.mockReset())
  db.fn("PlatformSwitch.all").mockResolvedValue([{ key: "display.page_size", value: 50 }])
})

describe("platform settings", () => {
  it("reads through the platform tag", async () => {
    expect((await getPlatformSettings())["display.page_size"]).toBe(50)
    expect(cacheApi.cacheTag).toHaveBeenCalledWith("platform-settings")
  })

  it("falls back to the defaults when the database cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    db.fn("PlatformSwitch.all").mockRejectedValue(new Error("down"))
    expect((await getPlatformSettings())["display.page_size"]).toBe(20)
  })

  it("expires the platform tag on save", async () => {
    await saveSettings({ "display.page_size": 50 }, "root-1")
    expect(cacheApi.updateTag).toHaveBeenCalledWith("platform-settings")
  })
})

describe("tenant settings", () => {
  it("reads one tenant's rows under that tenant's tag", async () => {
    db.fn("TenantSetting.all").mockResolvedValue([{ key: "display.page_size", value: 100 }])
    expect((await getTenantSettings("t1"))["display.page_size"]).toBe(100)
    expect(cacheApi.cacheTag).toHaveBeenCalledWith("tenant-settings:t1")
    expect(db.call("TenantSetting.all")?.chain).toContainEqual(["where", [{ tenantId: "t1" }]])
  })

  it("expires only that tenant's tag on save", async () => {
    await saveTenantSettings("t1", { "display.page_size": 100 }, "u1")
    expect(cacheApi.updateTag).toHaveBeenCalledTimes(1)
    expect(cacheApi.updateTag).toHaveBeenCalledWith("tenant-settings:t1")
  })
})

describe("user settings", () => {
  it("reads one person's rows under that person's tag", async () => {
    db.fn("UserSetting.all").mockResolvedValue([{ key: "locale.app", value: "vi" }])
    expect(await getUserSettingRows("u1")).toEqual([{ key: "locale.app", value: "vi" }])
    expect(cacheApi.cacheTag).toHaveBeenCalledWith("user-settings:u1")
  })

  it("expires that person's tag on save, also when a value is removed", async () => {
    await saveUserSettings("u1", { "locale.app": null })
    expect(cacheApi.updateTag).toHaveBeenCalledWith("user-settings:u1")
  })
})
