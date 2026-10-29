"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { db8 } from "@/lib/db8"
import { enqueueJob } from "@/platform/jobs/runner"
import { tenantPath } from "@/lib/tenant-paths"

/** Chatbot dashboard actions (task 7.4): re-index on demand, save the
 * bot's settings (tone, languages). */
export async function reindexNow() {
  try {
    const c = await requireTenantContext("settings", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "chatbot")
    await enqueueJob("platform.chatbot.reindex", { tenantId: c.tenantId }, { tenantId: c.tenantId })
    await audit(ctx, { action: "chatbot.reindex_enqueued", targetType: "Tenant", targetId: c.tenantId })
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function saveChatbotSettings(input: { tone?: string; languages?: string[] }) {
  try {
    const c = await requireTenantContext("settings", "manage")
    const ctx = { tenantId: c.tenantId, actor: { kind: "member" as const, userId: c.user.id, role: c.member.role } }
    await requireModule(ctx, "chatbot")
    await db8.orm.public.TenantSetting.upsert({
      conflictOn: { tenantId: c.tenantId, key: "chatbot.settings" },
      create: {
        tenantId: c.tenantId,
        key: "chatbot.settings",
        value: { tone: input.tone ?? null, languages: input.languages ?? [] },
      },
      update: { value: { tone: input.tone ?? null, languages: input.languages ?? [] } },
    })
    await audit(ctx, { action: "chatbot.settings_saved", targetType: "Tenant", targetId: c.tenantId })
    revalidatePath(tenantPath(c.tenantId, "chatbot"))
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
