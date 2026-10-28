import { describe, expect, it } from "vitest"
import { FEATURES } from "@/platform/entitlements/registry"
import { resolveEntitlements } from "@/platform/entitlements/resolve"

describe("resolveEntitlements (phase 1: switches over defaults)", () => {
  it("gives the registry defaults when no switch is set", () => {
    const ent = resolveEntitlements({})
    expect(ent.has("roles.custom")).toBe(true)
    expect(ent.limit("roles.max")).toBe(FEATURES["roles.max"].default)
  })

  it("turns a feature off with its kill switch, and its dependants with it", () => {
    const ent = resolveEntitlements({ "feature.roles.custom": false })
    expect(ent.has("roles.custom")).toBe(false)
    expect(ent.limit("roles.max")).toBe(0)
  })

  it("can switch off a limit on its own", () => {
    const ent = resolveEntitlements({ "feature.roles.max": false })
    expect(ent.has("roles.custom")).toBe(true)
    expect(ent.limit("roles.max")).toBe(0)
  })

  it("ignores switches that are not false, and survives a requirement cycle", () => {
    expect(resolveEntitlements({ "feature.roles.custom": "no" }).has("roles.custom")).toBe(true)
    const ent = resolveEntitlements(
      {},
      {
        a: { kind: "boolean", default: true, requires: ["b" as never] },
        b: { kind: "boolean", default: true, requires: ["a" as never] },
      }
    )
    expect(ent.has("a" as never)).toBe(false)
  })

  it("treats unlimited as null and an unknown key as off", () => {
    const ent = resolveEntitlements({}, { seats: { kind: "limit", default: null } })
    expect(ent.limit("seats" as never)).toBeNull()
    expect(ent.has("nope" as never)).toBe(false)
  })
})

describe("feature registry", () => {
  it("only requires features it declares", () => {
    for (const definition of Object.values(FEATURES)) {
      for (const required of ("requires" in definition ? definition.requires : []) ?? []) {
        expect(FEATURES).toHaveProperty([required])
      }
    }
  })
})
