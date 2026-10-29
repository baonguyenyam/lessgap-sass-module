import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetDatabase } from "@tests/helpers/db"

const trigger = vi.fn().mockResolvedValue(undefined)
vi.mock("pusher", () => {
  return {
    default: class {
      trigger = trigger
      authenticate() {
        return { auth: "x" }
      }
    },
  }
})
vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

describe("realtime (13.2)", () => {
  beforeEach(async () => {
    await resetDatabase()
    trigger.mockClear()
    process.env.PUSHER_APP_ID = "a"
    process.env.PUSHER_KEY = "k"
    process.env.PUSHER_SECRET = "s"
    process.env.PUSHER_CLUSTER = "c"
  })

  it("publishBookingChange triggers the tenant's channel when configured", async () => {
    const { publishBookingChange, bookingChannel } = await import("@/platform/realtime/pusher")
    await publishBookingChange("t1", { appointmentId: "a1", status: "confirmed" })
    expect(trigger).toHaveBeenCalledWith(bookingChannel("t1"), "booking.changed", {
      appointmentId: "a1",
      status: "confirmed",
    })
  })

  it("publishBookingChange is a no-op without PUSHER_*", async () => {
    delete process.env.PUSHER_APP_ID
    const { publishBookingChange } = await import("@/platform/realtime/pusher")
    await publishBookingChange("t1", { appointmentId: "a1", status: "confirmed" })
    expect(trigger).not.toHaveBeenCalled()
  })
})
