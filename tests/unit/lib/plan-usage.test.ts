import { describe, expect, it } from "vitest"
import { includedInPlan, usageRows } from "@/lib/plan-usage"
import { FEATURES, type FeatureKey, type LimitFeature } from "@/platform/entitlements/registry"
import type { Entitlements } from "@/platform/entitlements"

const ent = (features: Record<string, boolean | number | null>): Entitlements => ({
  has: (key) => features[key] === true,
  limit: (key: LimitFeature) =>
    typeof features[key] === "number" || features[key] === null ? (features[key] as number | null) : null,
})

describe("includedInPlan", () => {
  it("maps every registry feature, in declaration order", () => {
    const rows = includedInPlan(ent({}))
    expect(rows.map((r) => r.key)).toEqual(Object.keys(FEATURES) as FeatureKey[])
  })

  it("booleans resolve through has, limits keep their number or null", () => {
    const rows = includedInPlan(ent({ booking: true, "members.max": 3, "shop.products.max": null }))
    const booking = rows.find((r) => r.key === "booking")!
    expect(booking).toMatchObject({ kind: "boolean", included: true, limit: null })
    const members = rows.find((r) => r.key === "members.max")!
    expect(members).toMatchObject({ kind: "limit", included: true, limit: 3 })
    const unlimited = rows.find((r) => r.key === "shop.products.max")!
    expect(unlimited).toMatchObject({ included: true, limit: null })
    // A zero limit is "not included", not "none used".
    const zeroed = includedInPlan(ent({ "members.max": 0 })).find((r) => r.key === "members.max")!
    expect(zeroed).toMatchObject({ included: false, limit: 0 })
  })
})

it("every feature key has a label in en.json", async () => {
  const fs = await import("node:fs")
  const en = JSON.parse(fs.readFileSync("src/locales/en.json", "utf8"))
  const labels = en.dashboard.billing.featureLabels
  for (const key of Object.keys(FEATURES)) {
    expect(labels[key.replaceAll(".", "_")], `featureLabels.${key}`).toBeTypeOf("string")
  }
})

describe("usageRows", () => {
  it("keeps only capped limits", () => {
    const rows = usageRows([
      { key: "members.max", used: 2, limit: 3 },
      { key: "shop.products.max", used: 40, limit: null },
      { key: "chatbot.messages.monthly", used: 0, limit: 1000 },
    ])
    expect(rows.map((r) => r.key)).toEqual(["members.max", "chatbot.messages.monthly"])
  })
})
