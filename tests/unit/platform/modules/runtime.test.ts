import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db8", async () => (await import("@tests/helpers/db8-mock")).createDb8Mock())

const { dependantsOf, moduleActive } = await import("@/platform/modules/runtime")

const registry = {
  catalog: {},
  booking: { dependsOn: ["catalog"] },
  quotes: { dependsOn: ["booking"] },
  loopA: { dependsOn: ["loopB"] },
  loopB: { dependsOn: ["loopA"] },
}
const on = (...keys: string[]) => Object.fromEntries(keys.map((k) => [`module.${k}`, true]))

describe("moduleActive", () => {
  it("needs the module registered, available and enabled", () => {
    const input = { registry, switches: on("catalog"), enabled: new Set(["catalog"]) }
    expect(moduleActive("catalog", input)).toBe(true)
    expect(moduleActive("catalog", { ...input, switches: {} })).toBe(false)
    expect(moduleActive("catalog", { ...input, enabled: new Set() })).toBe(false)
    expect(moduleActive("missing", { ...input, switches: on("missing"), enabled: new Set(["missing"]) })).toBe(false)
  })

  it("needs every dependency active, all the way down", () => {
    const all = {
      registry,
      switches: on("catalog", "booking", "quotes"),
      enabled: new Set(["catalog", "booking", "quotes"]),
    }
    expect(moduleActive("quotes", all)).toBe(true)
    expect(moduleActive("quotes", { ...all, enabled: new Set(["booking", "quotes"]) })).toBe(false)
    expect(moduleActive("quotes", { ...all, switches: on("booking", "quotes") })).toBe(false)
  })

  it("never treats a module in a dependency cycle as active", () => {
    expect(
      moduleActive("loopA", { registry, switches: on("loopA", "loopB"), enabled: new Set(["loopA", "loopB"]) })
    ).toBe(false)
  })
})

describe("dependantsOf", () => {
  it("lists the enabled modules that need this one", () => {
    expect(dependantsOf("catalog", registry, new Set(["catalog", "booking"]))).toEqual(["booking"])
    expect(dependantsOf("catalog", registry, new Set(["catalog"]))).toEqual([])
  })
})
