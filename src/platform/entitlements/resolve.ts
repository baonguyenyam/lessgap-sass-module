import { FEATURES, type BooleanFeature, type FeatureDefinition, type FeatureKey, type LimitFeature } from "./registry"

export type Entitlements = {
  has(key: BooleanFeature): boolean
  /** `null` is unlimited, `0` not included. */
  limit(key: LimitFeature): number | null
}

/** A staff override of one feature for one tenant (spec/04, layer 4). */
export type OverrideRow = { featureKey: string; value: unknown; ignoresSwitch: boolean }

/**
 * The five layers, in order (spec/04-entitlements.md):
 * 1. Platform switch `feature.<key>` — can only remove; wins over everything
 *    except an override marked `ignoresSwitch`.
 * 2. Plan — the tenant's plan feature map (`{ [key]: boolean | number | null }`),
 *    falling back to the registry default for keys the plan does not mention.
 * 3. Add-ons — merged over the plan: booleans OR, limits take the max
 *    (`null` is unlimited and wins over every number).
 * 4. Override — an unexpired `EntitlementOverride` replaces the value outright.
 * 5. Tenant setting `feature.<key>` — the tenant's own choice; can only remove.
 * Then `requires`: a feature whose requirement is off is off too.
 */
export type ResolveInput = {
  switches: Record<string, unknown>
  planFeatures: Record<string, unknown> | null
  addOnFeatures: ReadonlyArray<Record<string, unknown>>
  overrides: ReadonlyArray<OverrideRow>
  tenantSettings: Record<string, unknown>
}

type Value = boolean | number | null

const toValue = (definition: FeatureDefinition, raw: unknown): Value =>
  definition.kind === "boolean" ? raw !== false && raw != null : raw == null ? null : Number(raw)

export function resolveEntitlements(
  input: ResolveInput | Record<string, unknown>,
  registry: Record<string, FeatureDefinition> = FEATURES
): Entitlements {
  // The phase-1 shape is the layers-empty case: a bare switches object keeps
  // working for callers and tests that only exercise layer 1.
  const resolvedInput: ResolveInput =
    "switches" in input
      ? (input as ResolveInput)
      : { switches: input, planFeatures: null, addOnFeatures: [], overrides: [], tenantSettings: {} }
  const { switches, planFeatures, addOnFeatures, overrides, tenantSettings } = resolvedInput
  const overrideByKey = new Map<string, OverrideRow>(overrides.map((o) => [o.featureKey, o]))

  const resolved = (key: string, seen = new Set<string>()): Value => {
    const definition = registry[key]
    if (!definition || seen.has(key)) return false
    seen.add(key)

    const override = overrideByKey.get(key)
    // Layer 1: a switch that is off removes the feature, unless an
    // ignoresSwitch override re-adds it (beta testers, trials).
    if (switches[`feature.${key}`] === false && !override?.ignoresSwitch) return false

    // Layer 2: plan map over the registry default.
    let value: Value =
      planFeatures && key in planFeatures
        ? toValue(definition, planFeatures[key])
        : toValue(definition, definition.default)

    // Layer 3: add-ons merge over the plan — boolean OR, limit max.
    for (const addOn of addOnFeatures) {
      if (!(key in addOn)) continue
      const addOnValue = toValue(definition, addOn[key])
      if (definition.kind === "boolean") value = value || addOnValue
      else if (addOnValue === null) value = null
      else if (typeof addOnValue === "number")
        value = Math.max(value === null ? addOnValue : value === true ? 0 : (value as number), addOnValue)
    }

    // Layer 4: an unexpired staff override replaces whatever the layers below said.
    if (override) value = toValue(definition, override.value)

    // Layer 5: the tenant's own switch-off. It can only remove.
    if (tenantSettings[`feature.${key}`] === false) return false

    // A feature whose requirement is off is off too (a limit becomes 0).
    if (!(definition.requires ?? []).every((required) => resolved(required, seen))) {
      return false
    }
    return value
  }

  return {
    has: (key: FeatureKey) => resolved(key) === true,
    limit: (key: FeatureKey) => {
      const value = resolved(key)
      return typeof value === "number" ? value : value === null && registry[key]?.kind === "limit" ? null : 0
    },
  }
}

export type { BooleanFeature, LimitFeature }
