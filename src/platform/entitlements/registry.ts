/**
 * The feature registry (spec/04-entitlements.md, "The feature registry"):
 * every feature declared once, in code. Kernel features live here; module
 * manifests add theirs when modules land.
 *
 * `default` is what a tenant gets until plans exist (phase 2 resolves plans,
 * add-ons and overrides); the platform switch `feature.<key>` can already turn
 * a feature off for everyone.
 */
export type FeatureDefinition =
  | { kind: "boolean"; default: boolean; requires?: readonly string[] }
  // `period` ("month") makes the limit metered through `UsageCounter`:
  // consumed with `consumeLimit`, reset by the period bucket, not counted
  // from live rows.
  | { kind: "limit"; default: number | null; period?: string; requires?: readonly string[] }

export const FEATURES = {
  // Custom roles ("nhóm quyền"), spec/adr/0019: the capability and its size.
  "roles.custom": { kind: "boolean", default: true },
  "roles.max": { kind: "limit", default: 10, requires: ["roles.custom"] },
  // Metered example wired to the subscribers CSV export (task 2.3).
  "newsletter.exports.monthly": { kind: "limit", default: null, period: "month" },
} as const satisfies Record<string, FeatureDefinition>

export type FeatureKey = keyof typeof FEATURES
export type BooleanFeature = {
  [K in FeatureKey]: (typeof FEATURES)[K]["kind"] extends "boolean" ? K : never
}[FeatureKey]
export type LimitFeature = { [K in FeatureKey]: (typeof FEATURES)[K]["kind"] extends "limit" ? K : never }[FeatureKey]

/**
 * Modules declare their features through this so the type-check keeps feature
 * keys honest everywhere (`ent.has`, `ent.limit`, plan maps, overrides).
 */
export function defineFeatures<T extends Record<string, FeatureDefinition>>(defs: T): T {
  return defs
}
