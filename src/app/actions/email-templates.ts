"use server"

import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { templateKeys, templateLocales } from "@/emails/templates"

/** The tenant's email template overrides (the in-system management rule):
 * `notify.template.<key>.<locale>` in TenantSetting overrides the kit's
 * default — the send path already falls back when no override exists. */
const input = z.object({
  templateKey: z.string().min(1),
  locale: z.string().min(2),
  subject: z.string().min(1),
  html: z.string().min(1),
})

export async function saveEmailTemplate(values: z.input<typeof input>) {
  try {
    const m = await requireTenantContext("settings", "manage")
    const parsed = input.safeParse(values)
    if (!parsed.success) throw new AppError("invalid_input")
    const { templateKey, locale, subject, html } = parsed.data
    if (!templateKeys.includes(templateKey) || !templateLocales(templateKey).includes(locale)) {
      throw new AppError("invalid_input")
    }
    const key = `notify.template.${templateKey}.${locale}`
    await db8.orm.public.TenantSetting.upsert({
      conflictOn: { tenantId: m.tenantId, key } as never,
      create: { tenantId: m.tenantId, key, value: { subject, html }, updatedById: m.user.id },
      update: { value: { subject, html }, updatedById: m.user.id },
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "settings.email_template_saved", targetType: "TenantSetting", targetId: key })
    return { ok: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function resetEmailTemplate(values: { templateKey: string; locale: string }) {
  try {
    const m = await requireTenantContext("settings", "manage")
    const key = `notify.template.${values.templateKey}.${values.locale}`
    await db8.orm.public.TenantSetting.where({ tenantId: m.tenantId, key }).delete()
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "settings.email_template_reset", targetType: "TenantSetting", targetId: key })
    return { ok: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
