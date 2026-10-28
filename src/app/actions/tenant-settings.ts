"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { db8 } from "@/lib/db8"
import { isTenantSettingKey, parseSettingValue, type PlatformSettings } from "@/platform/settings/registry"
import { saveTenantSettings } from "@/platform/settings/tenant-store"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** Settings → Localization and Display: the tenant's own values. */
export async function saveTenantSettingsAction(values: Record<string, unknown>): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("settings", "manage")
  const tAdmin = await getTranslations("admin.settings")

  const parsed: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values)) {
    if (!isTenantSettingKey(key)) return { error: tAdmin("errors.unknown") }
    const value = parseSettingValue(key, raw)
    if (value === null) return { error: tAdmin("errors.invalid") }
    parsed[key] = value
  }
  if (Object.keys(parsed).length === 0) return {}

  await saveTenantSettings(ctx.tenantId, parsed as Partial<PlatformSettings>, ctx.user.id)
  revalidatePath("/dashboard", "layout")
  revalidatePath("/t/[slug]", "layout")
  return {}
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Settings → General: the tenant's name and slug. */
export async function saveTenantGeneral(values: unknown): Promise<{ error?: string }> {
  const ctx = await requireTenantContext("settings", "manage")
  const t = await getTranslations("dashboard.settings.tenant.errors")
  const parsed = z
    .object({
      name: z.string().trim().min(1, t("invalidName")).max(80, t("invalidName")),
      slug: z.string().trim().toLowerCase().max(48, t("invalidSlug")).regex(SLUG, t("invalidSlug")),
    })
    .safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const taken = await db8.orm.public.Tenant.select("id").where({ slug: parsed.data.slug }).first()
  if (taken && taken.id !== ctx.tenantId) return { error: t("slugTaken") }

  await db8.orm.public.Tenant.where({ id: ctx.tenantId }).update({ name: parsed.data.name, slug: parsed.data.slug })
  revalidatePath("/dashboard", "layout")
  revalidatePath("/t/[slug]", "layout")
  return {}
}
