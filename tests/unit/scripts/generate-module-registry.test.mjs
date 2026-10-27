import { describe, expect, it } from "vitest"
import { generateRegistrySource } from "#scripts/generate-module-registry.mjs"

describe("generateRegistrySource", () => {
  it("generates the same registry source regardless of input order", () => {
    expect(generateRegistrySource(["booking", "catalog"])).toBe(generateRegistrySource(["catalog", "booking"]))
  })

  it("imports each module and uses its declared key", () => {
    expect(generateRegistrySource(["booking"])).toContain('"booking": module_0,')
    expect(generateRegistrySource(["booking"])).toContain('import module_0 from "./booking/module"')
  })

  it("rejects an unsafe module key", () => {
    expect(() => generateRegistrySource(["../escape"])).toThrow("Invalid module key")
  })

  it("rejects duplicate module keys", () => {
    expect(() => generateRegistrySource(["booking", "booking"])).toThrow("unique")
  })
})
