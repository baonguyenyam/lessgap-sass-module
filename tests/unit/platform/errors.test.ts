import { describe, expect, it } from "vitest"
import { AppError, ERROR_CODES } from "@/platform/errors"

describe("AppError", () => {
  it.each(ERROR_CODES)("keeps the %s code and optional field", (code) => {
    const error = new AppError(code, { field: "email" })

    expect(error).toMatchObject({ name: "AppError", code, field: "email" })
    expect(error).toBeInstanceOf(Error)
  })

  it("leaves the field off when there is no field context", () => {
    expect(new AppError("invalid_input").field).toBeUndefined()
  })
})
