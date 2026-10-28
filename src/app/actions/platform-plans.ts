"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { audit, platformAuditContext } from "@/platform/audit"
import { validateFeatureMap } from "@/platform/entitlements/registry"
import { requirePlatformRole } from "@/platform/staff"

const PLANS_PATH = "/platform/plans"
const VISIBILITIES = ["PUBLIC", "UNLISTED", "ARCHIVED"] as const

export type PlanPatch = {
  visibility?: string
  setupFeeCents?: number | null
  features?: unknown
}

/**
 * Edits one plan (task 2.5): visibility, the one-time setup fee and the
 * feature map the resolver reads for every subscribed tenant. The feature
 * map validates against the registry — an unknown key or a value of the
 * wrong kind refuses the whole save, so a plan never half-changes what
 * its tenants resolve.
 */
export async function updatePlan(planId: string, patch: PlanPatch): Promise<{ error?: string }> {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform.plans.errors")

  const plan = await db8.orm.public.Plan.where({ id: planId }).first()
  if (!plan) return { error: t("notFound") }

  const update: Record<string, unknown> = {}
  const changes: Record<string, unknown> = {}

  if (patch.visibility !== undefined) {
    if (!(VISIBILITIES as readonly string[]).includes(patch.visibility)) return { error: t("badVisibility") }
    update.visibility = patch.visibility
    changes.visibility = patch.visibility
  }
  if (patch.setupFeeCents !== undefined) {
    if (patch.setupFeeCents !== null && (!Number.isInteger(patch.setupFeeCents) || patch.setupFeeCents < 0))
      return { error: t("badSetupFee") }
    update.setupFeeCents = patch.setupFeeCents
    changes.setupFeeCents = patch.setupFeeCents
  }
  if (patch.features !== undefined) {
    const bad = validateFeatureMap(patch.features)
    if (bad) return { error: t("badFeatures", { detail: bad }) }
    update.features = (patch.features ?? {}) as never
    changes.features = patch.features
  }
  if (Object.keys(update).length === 0) return {}

  const subscribers = (await db8.orm.public.Subscription.where({ planId }).aggregate((a) => ({ n: a.count() }))).n
  await db8.orm.public.Plan.where({ id: planId }).update(update as never)
  await audit(platformAuditContext(user.id), {
    action: "platform.plan.updated",
    targetType: "plan",
    targetId: planId,
    data: { changes: changes as never, subscribers },
  })
  revalidatePath(PLANS_PATH, "page")
  return {}
}
