import { AppError } from "@/platform/errors"
import { getPlatformSwitches } from "@/platform/settings/store"
import type { BooleanFeature } from "./registry"
import { resolveEntitlements, type Entitlements } from "./resolve"

export type { Entitlements } from "./resolve"

/**
 * What a tenant may use (spec/04-entitlements.md, "Asking the question").
 * Phase 1 resolves platform switches and registry defaults only, so the
 * answer is the same for every tenant; the tenant id is already the key so
 * callers do not change when plans arrive.
 */
export async function getEntitlements(_ctx: { tenantId: string }): Promise<Entitlements> {
  return resolveEntitlements(await getPlatformSwitches())
}

/** Refuse when the tenant may not use `key`: `feature_unavailable` (a 404 on routes). */
export async function requireFeature(ctx: { tenantId: string }, key: BooleanFeature): Promise<void> {
  if (!(await getEntitlements(ctx)).has(key)) throw new AppError("feature_unavailable")
}
