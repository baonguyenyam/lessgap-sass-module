import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { AppError } from "@/platform/errors"
import { getPlatformSwitches } from "@/platform/settings/store"
import type { BooleanFeature } from "./registry"
import { resolveEntitlements, type Entitlements, type ResolveInput } from "./resolve"

export type { Entitlements } from "./resolve"
export { defineFeatures } from "./registry"

/**
 * What a tenant may use (spec/04-entitlements.md): the five layers resolved in
 * order — platform switch, plan, add-ons, staff overrides, tenant setting —
 * through one registry. `ent.has` answers booleans, `ent.limit` answers
 * numbers (`null` unlimited, `0` not included).
 */
export async function getEntitlements(ctx: { tenantId: string }): Promise<Entitlements> {
  const { Subscription, TenantAddOn, EntitlementOverride, TenantSetting } = db8.orm.public

  const [switches, subscription, tenantAddOns, overrides, settings] = await Promise.all([
    getPlatformSwitches(),
    // One subscription per tenant; its plan's feature map is layer 2. A tenant
    // without one resolves on registry defaults (the free catalogue row
    // becomes a plan assignment in 2.7, not a resolver special-case).
    Subscription.where({ tenantId: ctx.tenantId })
      .include("plan", (p) => p.select("features"))
      .first(),
    TenantAddOn.where({ tenantId: ctx.tenantId })
      .include("addOn", (a) => a.select("features", "isActive"))
      .all(),
    EntitlementOverride.select("featureKey", "value", "ignoresSwitch", "expiresAt")
      .where({ tenantId: ctx.tenantId })
      .all(),
    TenantSetting.select("key", "value").where({ tenantId: ctx.tenantId }).all(),
  ])

  const now = Date.now()
  const input: ResolveInput = {
    switches,
    planFeatures: (subscription?.plan?.features as Record<string, unknown>) ?? null,
    addOnFeatures: tenantAddOns.flatMap((t) =>
      t.addOn?.isActive ? [(t.addOn.features as Record<string, unknown>) ?? {}] : []
    ),
    // An expired override stops applying without anyone deleting it.
    overrides: overrides
      .filter((o) => !o.expiresAt || toDate(o.expiresAt).getTime() > now)
      .map((o) => ({ featureKey: o.featureKey, value: o.value, ignoresSwitch: o.ignoresSwitch })),
    tenantSettings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
  }
  return resolveEntitlements(input)
}

/** Refuse when the tenant may not use `key`: `feature_unavailable` (a 404 on routes). */
export async function requireFeature(ctx: { tenantId: string }, key: BooleanFeature): Promise<void> {
  if (!(await getEntitlements(ctx)).has(key)) throw new AppError("feature_unavailable")
}
