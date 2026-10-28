"use server"

import { updateTag } from "next/cache"
import { getTranslations } from "next-intl/server"
import { db8, uniqueIndexKey } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { parseHours } from "@/lib/hours"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/**
 * The site settings save (task 3.3): one action writes the Site (created on
 * first save, the tenant's public site at `<slug>.<sites-domain>`) and its
 * SiteSettings — company profile, hours, appearance — and tags the site so
 * the published page revalidates.
 */
export async function saveSiteSettings(input: {
  name: string
  tagline?: string
  phone?: string
  email?: string
  address?: string
  hours?: Record<string, string>
  accentColor?: string
}) {
  const t = await getTranslations("dashboard.settings.site.errors")
  try {
    const ctx = await requireTenantContext("settings", "manage")
    const actor = { kind: "member" as const, userId: ctx.user.id, role: ctx.member.role }
    const profile = {
      name: input.name.trim(),
      tagline: input.tagline?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      email: input.email?.trim() ?? "",
      address: input.address?.trim() ?? "",
    }
    if (!profile.name) return { error: t("nameRequired") }
    const hours = input.hours ? parseHours(input.hours) : undefined
    if (hours && "error" in hours) return { error: t("hoursInvalid", { day: hours.error.split(":")[1] }) }
    const appearance = { accentColor: input.accentColor?.trim() ?? "" }

    await db8.orm.public.Site.upsert({
      conflictOn: uniqueIndexKey({ tenantId: ctx.tenantId }),
      create: { tenantId: ctx.tenantId, themeKey: "main" },
      update: { updatedAt: nowTs() },
    })
    await db8.orm.public.SiteSettings.upsert({
      conflictOn: uniqueIndexKey({ tenantId: ctx.tenantId }),
      create: { tenantId: ctx.tenantId, profile, hours, appearance },
      update: { profile, hours, appearance },
    })
    await audit({ tenantId: ctx.tenantId, actor }, { action: "site.settings.saved", targetType: "SiteSettings" })
    updateTag(`site:${ctx.tenantId}`)
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
