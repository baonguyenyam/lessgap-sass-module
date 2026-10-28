"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { db8, uniqueIndexKey } from "@/lib/db8"
import { toTs } from "@/lib/timestamps"
import { audit, platformAuditContext } from "@/platform/audit"
import { FEATURES, type FeatureDefinition } from "@/platform/entitlements/registry"
import { requirePlatformRole } from "@/platform/staff"

/**
 * Grants, changes or revokes one entitlement override for a tenant (task 2.6).
 * The feature must be declared, the value must match its kind, and the reason
 * is required — staff explain why a tenant deviates. Expiry is optional; an
 * expired override simply stops applying. Every write is audited.
 */
export async function setEntitlementOverride(
  tenantId: string,
  featureKey: string,
  value: unknown,
  reason: string,
  expiresAt: string | null,
  ignoresSwitch: boolean
): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.overrides.errors")

  const definition = (FEATURES as Record<string, FeatureDefinition>)[featureKey]
  if (!definition) return { error: t("unknownFeature") }
  if (definition.kind === "boolean" && typeof value !== "boolean") return { error: t("badValue") }
  if (
    definition.kind === "limit" &&
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  )
    return { error: t("badValue") }
  if (!reason.trim()) return { error: t("reasonRequired") }

  const expires = expiresAt ? toTs(new Date(expiresAt)) : null
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) return { error: t("badExpiry") }

  await db8.orm.public.EntitlementOverride.upsert({
    conflictOn: uniqueIndexKey({ tenantId, featureKey }),
    create: {
      tenantId,
      featureKey,
      value: value as never,
      reason: reason.trim(),
      expiresAt: expires,
      ignoresSwitch,
      createdById: user.id,
    },
    update: { value: value as never, reason: reason.trim(), expiresAt: expires, ignoresSwitch, createdById: user.id },
  })
  await audit(platformAuditContext(user.id, tenantId), {
    action: "platform.override.upserted",
    targetType: "override",
    targetId: featureKey,
    data: { tenantId, value: value as never, reason: reason.trim(), expiresAt, ignoresSwitch },
  })
  revalidatePath("/platform/tenants/[slug]", "page")
  return {}
}

/** Revokes an override row outright; the layers below take over again. */
export async function revokeEntitlementOverride(overrideId: string): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.overrides.errors")

  const row = await db8.orm.public.EntitlementOverride.where({ id: overrideId }).first()
  if (!row) return { error: t("notFound") }
  await db8.orm.public.EntitlementOverride.where({ id: overrideId }).delete()
  await audit(platformAuditContext(user.id, row.tenantId), {
    action: "platform.override.revoked",
    targetType: "override",
    targetId: row.featureKey,
    data: { tenantId: row.tenantId },
  })
  revalidatePath("/platform/tenants/[slug]", "page")
  return {}
}
