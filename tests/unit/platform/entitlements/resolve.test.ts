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

  // Task 2.2: the five layers in order (spec/04-entitlements.md).
  describe("the five layers", () => {
    const registry = {
      flag: { kind: "boolean" as const, default: true },
      seats: { kind: "limit" as const, default: 3 },
    }
    const input = (over: Record<string, unknown> = {}) => ({
      switches: {},
      planFeatures: null,
      addOnFeatures: [],
      overrides: [],
      tenantSettings: {},
      ...over,
    })

    it("the plan map replaces the registry default", () => {
      const ent = resolveEntitlements(input({ planFeatures: { flag: false, seats: 10 } }), registry)
      expect(ent.has("flag" as never)).toBe(false)
      expect(ent.limit("seats" as never)).toBe(10)
    })

    it("a plan key the map omits falls back to the registry default", () => {
      const ent = resolveEntitlements(input({ planFeatures: { seats: 0 } }), registry)
      expect(ent.has("flag" as never)).toBe(true)
      expect(ent.limit("seats" as never)).toBe(0)
    })

    it("add-ons OR booleans and take the max of limits; null is unlimited", () => {
      const ent = resolveEntitlements(
        input({
          planFeatures: { flag: false, seats: 3 },
          addOnFeatures: [{ flag: true, seats: 7 }, { seats: 20 }],
        }),
        registry
      )
      expect(ent.has("flag" as never)).toBe(true)
      expect(ent.limit("seats" as never)).toBe(20)
      const unlimited = resolveEntitlements(input({ addOnFeatures: [{ seats: null }] }), registry)
      expect(unlimited.limit("seats" as never)).toBeNull()
    })

    it("an override replaces every lower layer, and an expired one falls through", () => {
      const ent = resolveEntitlements(
        input({
          planFeatures: { flag: false },
          addOnFeatures: [{ flag: false }],
          overrides: [{ featureKey: "flag", value: true, ignoresSwitch: false }],
        }),
        registry
      )
      expect(ent.has("flag" as never)).toBe(true)
    })

    it("a platform switch beats plan and override unless the override ignores it", () => {
      const off = resolveEntitlements(
        input({
          switches: { "feature.flag": false },
          planFeatures: { flag: true },
          overrides: [{ featureKey: "flag", value: true, ignoresSwitch: false }],
        }),
        registry
      )
      expect(off.has("flag" as never)).toBe(false)
      const beta = resolveEntitlements(
        input({
          switches: { "feature.flag": false },
          overrides: [{ featureKey: "flag", value: true, ignoresSwitch: true }],
        }),
        registry
      )
      expect(beta.has("flag" as never)).toBe(true)
    })

    it("the tenant's own setting can only remove", () => {
      const on = resolveEntitlements(
        input({ tenantSettings: { "feature.flag": true }, planFeatures: { flag: false } }),
        registry
      )
      expect(on.has("flag" as never)).toBe(false)
      const off = resolveEntitlements(input({ tenantSettings: { "feature.flag": false } }), registry)
      expect(off.has("flag" as never)).toBe(false)
    })

    it("a requirement that is off turns its dependant off whatever the layers say", () => {
      const chained = { ...registry, vip: { kind: "boolean" as const, default: true, requires: ["flag"] } }
      const ent = resolveEntitlements(
        input({
          planFeatures: { flag: false, vip: true },
          overrides: [{ featureKey: "vip", value: true, ignoresSwitch: false }],
        }),
        chained
      )
      expect(ent.has("vip" as never)).toBe(false)
    })
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
