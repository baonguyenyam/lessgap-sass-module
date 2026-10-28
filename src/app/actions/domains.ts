"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/platform/errors"
import { addDomain, checkDomain, removeDomain, setPrimaryDomain } from "@/platform/domains"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import type { TenantContext } from "@/platform/tenancy/context"

/** Settings → Domain actions (task 3.7, spec/03): add a custom domain,
 * check its verification, mark it primary, remove it. */
async function ctx(): Promise<TenantContext> {
  const c = await requireTenantContext("settings", "manage")
  return { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } }
}

async function guard(fn: () => Promise<unknown>): Promise<{ error?: string }> {
  try {
    await fn()
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function addTenantDomain(hostname: string) {
  return guard(async () => addDomain(await ctx(), hostname))
}

export async function checkTenantDomain(hostname: string) {
  return guard(async () => checkDomain(await ctx(), hostname))
}

export async function removeTenantDomain(hostname: string) {
  return guard(async () => removeDomain(await ctx(), hostname))
}

export async function setPrimaryTenantDomain(hostname: string) {
  return guard(async () => setPrimaryDomain(await ctx(), hostname))
}
