"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { AppError } from "@/platform/errors"
import { cancelModulePurge, requestModuleExport, scheduleModulePurge } from "@/platform/modules/lifecycle"
import { disableModule, enableModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { requirePlatformRole } from "@/platform/staff"
import type { TenantContext } from "@/platform/tenancy/context"

/**
 * The Settings → Modules actions (task 2.10, spec/15): enable, disable,
 * export and the 7-day-grace purge — the same surface for a tenant owner
 * (`/t/<slug>/settings/modules`) and for staff (`/platform/modules`).
 */

async function memberCtx(): Promise<TenantContext> {
  const ctx = await requireTenantContext("settings", "manage")
  return { tenantId: ctx.tenantId, actor: { kind: "member", userId: ctx.user.id, role: ctx.member.role } }
}

async function staffCtx(tenantId: string): Promise<TenantContext> {
  const { user } = await requirePlatformRole()
  return { tenantId, actor: { kind: "member", userId: user.id, role: "owner" } }
}

async function guard(fn: () => Promise<{ error?: string } | void>): Promise<{ error?: string }> {
  try {
    return (await fn()) ?? {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function setModuleEnabled(key: string, enabled: boolean, tenantId?: string) {
  const t = await getTranslations("dashboard.settings.modules.errors")
  return guard(async () => {
    const ctx = tenantId ? await staffCtx(tenantId) : await memberCtx()
    if (enabled) await enableModule(ctx, key)
    else await disableModule(ctx, key)
    revalidatePath("/t")
  }).then((r) => ({ error: r.error === "conflict" ? t("dependency") : r.error }))
}

export async function requestModuleDataExport(key: string, tenantId?: string) {
  return guard(async () => {
    const ctx = tenantId ? await staffCtx(tenantId) : await memberCtx()
    await requestModuleExport(ctx, key)
  })
}

export async function scheduleModuleDataPurge(key: string, typedName: string, tenantId?: string) {
  const t = await getTranslations("dashboard.settings.modules.errors")
  return guard(async () => {
    const ctx = tenantId ? await staffCtx(tenantId) : await memberCtx()
    const result = await scheduleModulePurge(ctx, key, typedName)
    if (result.error === "name_mismatch") return { error: t("nameMismatch") }
    return result
  }).then((r) => ({ error: r.error === "conflict" ? t("stillEnabled") : r.error }))
}

export async function cancelModuleDataPurge(key: string, tenantId?: string) {
  return guard(async () => {
    const ctx = tenantId ? await staffCtx(tenantId) : await memberCtx()
    await cancelModulePurge(ctx, key)
    revalidatePath("/t")
  })
}
