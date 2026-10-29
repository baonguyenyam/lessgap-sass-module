"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/platform/errors"
import { removeSampleData } from "@/platform/verticals/apply"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** One-click removal of the sample rows a vertical wrote (spec/06, task 4.4). */
export async function removeTenantSampleData(): Promise<{ error?: string }> {
  try {
    const c = await requireTenantContext("settings", "manage")
    await removeSampleData({ tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } })
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
