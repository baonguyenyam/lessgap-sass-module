import { FEATURES, type BooleanFeature, type FeatureDefinition, type FeatureKey, type LimitFeature } from "./registry"

export type Entitlements = {
  has(key: BooleanFeature): boolean
  /** `null` is unlimited, `0` not included. */
  limit(key: LimitFeature): number | null
}

/**
 * The phase-1 resolver: layer 1 (platform switches) over the registry
 * defaults. A switch `feature.<key>` set to `false` turns the feature off, and
 * a feature whose requirement is off is off too (a limit becomes 0). Pure, so
 * phase 2 can add plans, add-ons and overrides behind the same two questions.
 */
export function resolveEntitlements(
  switches: Record<string, unknown>,
  registry: Record<string, FeatureDefinition> = FEATURES
): Entitlements {
  const on = (key: string, seen = new Set<string>()): boolean => {
    const definition = registry[key]
    if (!definition || seen.has(key) || switches[`feature.${key}`] === false) return false
    seen.add(key)
    if (!(definition.requires ?? []).every((required) => on(required, seen))) return false
    return definition.kind === "boolean" ? definition.default : definition.default !== 0
  }
  return {
    has: (key: FeatureKey) => on(key),
    limit: (key: FeatureKey) => {
      const definition = registry[key]
      if (definition?.kind !== "limit" || !on(key)) return 0
      return definition.default
    },
  }
}
