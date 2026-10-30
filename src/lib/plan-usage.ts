import type { Entitlements } from "@/platform/entitlements"
import { FEATURES, type BooleanFeature, type FeatureKey, type LimitFeature } from "@/platform/entitlements/registry"

/** One row of the billing page's "Included in your plan" grid. */
export type PlanFeatureRow = {
  key: FeatureKey
  kind: "boolean" | "limit"
  /** Booleans: entitled or not. Limits: `0` is not included, `null` unlimited. */
  included: boolean
  limit: number | null
}

/** Every registry feature resolved for the tenant, in declaration order. */
export function includedInPlan(ent: Entitlements): PlanFeatureRow[] {
  return (Object.keys(FEATURES) as FeatureKey[]).map((key) => {
    const definition = FEATURES[key]
    if (definition.kind === "boolean") {
      return { key, kind: "boolean", included: ent.has(key as BooleanFeature), limit: null }
    }
    const limit = ent.limit(key as LimitFeature)
    return { key, kind: "limit", included: limit !== 0, limit }
  })
}

/** One line of the "Plan usage" card — only what the plan actually caps. */
export type LimitUsageRow = { key: LimitFeature; used: number; limit: number }

export function usageRows(
  rows: ReadonlyArray<{ key: LimitFeature; used: number; limit: number | null }>
): LimitUsageRow[] {
  return rows.filter((row): row is LimitUsageRow => row.limit !== null)
}
