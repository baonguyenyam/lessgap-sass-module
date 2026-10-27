import { describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }))

import { cacheLife } from "next/cache"
import { currentYear } from "@/lib/current-year"

describe("currentYear", () => {
  it("returns this year and asks for a daily cache", async () => {
    vi.useFakeTimers({ now: new Date("2031-03-04T10:00:00Z") })
    expect(await currentYear()).toBe(2031)
    expect(cacheLife).toHaveBeenCalledWith("days")
    vi.useRealTimers()
  })
})
