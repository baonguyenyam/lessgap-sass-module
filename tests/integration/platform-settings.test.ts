import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { getPlatformSwitches } from "@/platform/settings/store"
import { resetDatabase } from "@tests/helpers/db"

// Task 2.4: a switch written through the console action is visible to
// getPlatformSwitches on the next read, and leaves an audit row naming the
// staff member — the platform stays operable without a restart or SQL.
vi.mock("@/platform/staff", () => ({
  requirePlatformRole: async () => ({ user: { id: "staff-1" }, platformRole: "ADMIN" }),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

describe("platform settings", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a switch write is visible to readers and audited", async () => {
    const { setPlatformSwitch } = await import("@/app/actions/platform-settings")
    await expect(setPlatformSwitch("signup.free_plan.enabled", false)).resolves.toEqual({})
    await expect(setPlatformSwitch("feature.roles.custom", false)).resolves.toEqual({})
    await expect(setPlatformSwitch("bogus.key", true)).resolves.toEqual({ error: expect.any(String) })

    const switches = await getPlatformSwitches()
    expect(switches["signup.free_plan.enabled"]).toBe(false)
    expect(switches["feature.roles.custom"]).toBe(false)
    expect(switches["bogus.key"]).toBeUndefined()

    const audit = await db8.orm.public.AuditLog.select("actorId", "action", "targetId")
      .where({ action: "platform.switch.updated", targetId: "signup.free_plan.enabled" })
      .first()
    expect(audit).toMatchObject({ actorId: "staff-1", action: "platform.switch.updated" })
  })
})
