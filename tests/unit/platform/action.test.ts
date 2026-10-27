import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "@/platform/action"
import { AppError, ERROR_CODES } from "@/platform/errors"

const { logError } = vi.hoisted(() => ({ logError: vi.fn() }))

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => `translated:${key}`,
}))

vi.mock("@/platform/log", () => ({ log: { error: logError, info: vi.fn() } }))

describe("action", () => {
  beforeEach(() => logError.mockClear())

  it("returns successful handler data", async () => {
    const run = action(async (value: number) => value * 2)

    await expect(run(4)).resolves.toEqual({ ok: true, data: 8 })
  })

  it("omits the field when the typed error has no field context", async () => {
    const run = action(async () => {
      throw new AppError("not_found")
    })

    await expect(run()).resolves.toEqual({
      ok: false,
      error: { code: "not_found", message: "translated:not_found" },
    })
  })

  it.each(ERROR_CODES)("maps the %s error to a localized result", async (code) => {
    const run = action(async () => {
      throw new AppError(code, { field: "email" })
    })

    await expect(run()).resolves.toEqual({
      ok: false,
      error: { code, message: `translated:${code}`, field: "email" },
    })
    expect(logError).not.toHaveBeenCalled()
  })

  it("logs unexpected failures and returns the internal error", async () => {
    const run = action(async () => {
      throw new Error("unexpected")
    })

    await expect(run()).resolves.toEqual({
      ok: false,
      error: { code: "internal", message: "translated:internal" },
    })
    expect(logError).toHaveBeenCalledWith("platform.action.failed", { error: expect.any(Error) })
  })
})
