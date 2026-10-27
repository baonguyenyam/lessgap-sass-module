import { describe, expect, it } from "vitest"
import { isModuleActive } from "@/platform/modules/runtime"

const registeredModules = { booking: {}, catalog: {} }

describe("isModuleActive", () => {
  it("requires both a registered module and an enabled platform switch", () => {
    expect(isModuleActive("booking", { "module.booking": true }, registeredModules)).toBe(true)
    expect(isModuleActive("booking", { "module.booking": false }, registeredModules)).toBe(false)
    expect(isModuleActive("missing", { "module.missing": true }, registeredModules)).toBe(false)
  })

  it("treats an absent platform switch as disabled", () => {
    expect(isModuleActive("booking", {}, registeredModules)).toBe(false)
  })
})
