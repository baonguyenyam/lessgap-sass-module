"use server"

import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { createOnboardingLink } from "@/platform/payments/connect"
import { siteOrigin } from "@/platform/tenancy/site-origin"

/** Connect onboarding (task 6.3, spec/05): the owner clicks Connect in
 * Settings → Payments — we create the account once, hand back Stripe's
 * hosted onboarding link. Bank details never touch us. */
export async function startConnectOnboarding(): Promise<{ error?: string; url?: string }> {
  try {
    const c = await requireTenantContext("settings", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "payments")
    const tenant = await db8.orm.public.Tenant.where({ id: c.tenantId }).first()
    const url = await createOnboardingLink(
      c.tenantId,
      `${siteOrigin(tenant?.slug ?? "", null)}/t/${tenant?.slug}/settings/payments`
    )
    await audit(ctx, { action: "payments.connect_started", targetType: "Tenant", targetId: c.tenantId })
    return { url }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
