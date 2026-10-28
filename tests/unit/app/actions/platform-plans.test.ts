import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Db8Mock } from "@tests/helpers/db8-mock"

const staff = { user: { id: "staff-1" }, platformRole: "ADMIN" }
const plan = { id: "plan_1", name: "Pro", visibility: "PUBLIC" }

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/platform/staff", () => ({ requirePlatformRole: async () => staff }))
vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { updatePlan } = await import("@/app/actions/platform-plans")
const db = (await import("@/lib/db8")) as unknown as Db8Mock

beforeEach(() => {
  db.reset()
  db.fn("Plan.first").mockResolvedValue(plan)
})

describe("updatePlan", () => {
  it("refuses a feature map with an unknown key or wrong value kind", async () => {
    await expect(updatePlan("plan_1", { features: { "nope.key": true } })).resolves.toEqual({
      error: expect.any(String),
    })
    await expect(updatePlan("plan_1", { features: { "roles.custom": 7 } })).resolves.toEqual({
      error: expect.any(String),
    })
    await expect(updatePlan("plan_1", { features: { "roles.max": "many" } })).resolves.toEqual({
      error: expect.any(String),
    })
    expect(db.fn("Plan.update")).not.toHaveBeenCalled()
  })

  it("writes a valid feature map and audits the change with the subscriber count", async () => {
    db.fn("Subscription.aggregate").mockResolvedValue({ n: 3 })
    const features = { "roles.custom": false, "roles.max": 25 }
    await expect(updatePlan("plan_1", { visibility: "UNLISTED", setupFeeCents: 4900, features })).resolves.toEqual({})

    expect(db.fn("Plan.update")).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "UNLISTED", setupFeeCents: 4900, features })
    )
    expect(db.fn("AuditLog.create")).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "staff-1",
        action: "platform.plan.updated",
        targetType: "plan",
        targetId: "plan_1",
        data: expect.objectContaining({ subscribers: 3 }),
      })
    )
  })

  it("refuses a bad visibility and an unknown plan", async () => {
    await expect(updatePlan("plan_1", { visibility: "HIDDEN" })).resolves.toEqual({ error: expect.any(String) })
    db.fn("Plan.first").mockResolvedValue(null)
    await expect(updatePlan("plan_404", { visibility: "PUBLIC" })).resolves.toEqual({ error: expect.any(String) })
  })
})
