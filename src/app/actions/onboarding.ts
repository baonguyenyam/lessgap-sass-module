"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/auth"
import { db8, uniqueIndexKey } from "@/lib/db8"
import { and } from "@prisma/orm-postgres/orm-client"
import { audit } from "@/platform/audit"
import { assignFreePlan } from "@/lib/billing"
import { getPlatformSettings } from "@/platform/settings/store"
import { applyVertical } from "@/platform/verticals/apply"
import { getVertical, verticalKeys } from "@/verticals"
import { getMembership } from "@/platform/tenancy/require-member"
import { slugify } from "@/lib/slugify"

/** The get-started checklist's dismiss (kept — the checklist calls it). */
export async function dismissOnboarding() {
  const user = (await auth.api.getSession({ headers: await headers() }))?.user
  if (!user) return
  await db8.orm.public.UserSetting.upsert({
    conflictOn: uniqueIndexKey({ userId: user.id, key: "onboarding.dismissed" }),
    create: { userId: user.id, key: "onboarding.dismissed", value: true },
    update: { value: true },
  })
  revalidatePath("/dashboard")
}

/** The onboarding wizard's single submit (task 4.5, spec/06): create the
 * tenant with the chosen name+slug, apply the vertical's preset, create its
 * site, and land on the tenant dashboard. */
export async function startOnboarding(input: {
  name: string
  slug: string
  vertical: string
  phone?: string
  address?: string
}): Promise<{ error?: string; slug?: string }> {
  const user = (await auth.api.getSession({ headers: await headers() }))?.user
  if (!user) return { error: "unauthorized" }
  const existing = await getMembership(user.id)
  if (existing) return { error: "already_has_tenant" }

  const name = input.name.trim()
  if (!name) return { error: "invalid_input" }
  const slug = slugify(input.slug || name)
  if (!slug) return { error: "invalid_input" }
  if (await db8.orm.public.Tenant.where({ slug }).first()) return { error: "conflict" }
  const vertical = getVertical(input.vertical)
  if (!verticalKeys.includes(vertical.key) && input.vertical) return { error: "invalid_input" }

  await auth.api.createOrganization({ body: { name, slug, userId: user.id } })
  const member = await getMembership(user.id)
  if (!member) return { error: "tenant_creation_failed" }

  const settings = await getPlatformSettings()
  if (settings["signup.free_plan.enabled"]) {
    const freePlan = await db8.orm.public.Plan.where((p) =>
      and(p.isActive.eq(true), p.price.eq(0), p.stripePriceId.isNull())
    ).first()
    if (freePlan) await assignFreePlan(member.organizationId, freePlan)
  }
  if (!settings["signup.require_approval"]) {
    await db8.orm.public.Tenant.where({ id: member.organizationId }).update({ status: "ACTIVE" })
  }

  const ctx = { tenantId: member.organizationId, actor: { kind: "member" as const, userId: user.id, role: "owner" } }
  await applyVertical(ctx, vertical.key)
  await db8.orm.public.Site.create({ tenantId: member.organizationId, themeKey: vertical.defaultTheme })
  await db8.orm.public.SiteSettings.upsert({
    conflictOn: uniqueIndexKey({ tenantId: member.organizationId }),
    create: {
      tenantId: member.organizationId,
      profile: { name, phone: input.phone || "", address: input.address || "" },
    },
    update: {},
  })
  await audit(ctx, {
    action: "tenant.onboarded",
    targetType: "Tenant",
    targetId: member.organizationId,
    data: { slug, vertical: vertical.key },
  })
  revalidatePath("/t")
  return { slug }
}
