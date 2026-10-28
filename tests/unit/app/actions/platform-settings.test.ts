import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const staff = { user: { id: "staff-1" }, platformRole: "ADMIN" }

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/staff", () => ({ requirePlatformRole: async () => staff }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { setPlatformSwitch } = await import("@/app/actions/platform-settings")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

describe("setPlatformSwitch", () => {
  beforeEach(() => db.reset())

  it("writes a typed setting through its schema and audits it", async () => {
    await expect(setPlatformSwitch("display.page_size", 50)).resolves.toEqual({})
    expect(db.fn("PlatformSwitch.upsert")).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictOn: { key: "display.page_size" },
        update: expect.objectContaining({ value: 50, updatedById: "staff-1" }),
      })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "staff-1",
        action: "platform.switch.updated",
        targetType: "switch",
        targetId: "display.page_size",
      })
    )
  })

  it("refuses a value the key's schema rejects", async () => {
    await expect(setPlatformSwitch("display.page_size", 7)).resolves.toEqual({ error: "invalidValue" })
    expect(db.fn("PlatformSwitch.upsert")).not.toHaveBeenCalled()
  })

  it("writes untyped feature.* and module.* keys, refuses anything else", async () => {
    await expect(setPlatformSwitch("feature.roles.custom", false)).resolves.toEqual({})
    expect(db.fn("PlatformSwitch.upsert")).toHaveBeenCalledWith(
      expect.objectContaining({ conflictOn: { key: "feature.roles.custom" } })
    )
    await expect(setPlatformSwitch("nonsense", true)).resolves.toEqual({ error: "unknownKey" })
    await expect(setPlatformSwitch("  ", true)).resolves.toEqual({ error: "keyRequired" })
  })
})
