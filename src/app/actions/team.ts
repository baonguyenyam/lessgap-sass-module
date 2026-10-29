"use server"

import { updateTag } from "next/cache"
import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import type { TenantContext } from "@/platform/tenancy/context"

/** Team actions (task 4.3): a `StaffMember` is not a tenant member — no
 * login, no role — just a profile the site shows. */
async function ctx(): Promise<TenantContext> {
  const c = await requireTenantContext("team", "manage")
  return { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } }
}

async function guard(fn: (c: TenantContext) => Promise<unknown>): Promise<{ error?: string }> {
  try {
    const c = await ctx()
    await requireModule(c, "team")
    await fn(c)
    updateTag(`site:${c.tenantId}`)
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function addStaff(input: { name: string; bio?: string }) {
  return guard(async (c) => {
    if (!input.name.trim()) throw new AppError("invalid_input", { field: "name" })
    await db8.orm.public.StaffMember.create({ tenantId: c.tenantId, name: input.name.trim(), bio: input.bio || null })
    await audit(c, { action: "team.staff_added", targetType: "StaffMember", data: { name: input.name } })
  })
}

export async function removeStaff(staffId: string) {
  return guard(async (c) => {
    const row = await db8.orm.public.StaffMember.where({ id: staffId, tenantId: c.tenantId }).first()
    if (!row) throw new AppError("not_found")
    await db8.orm.public.StaffService.where({ staffMemberId: staffId }).delete()
    await db8.orm.public.StaffMember.where({ id: staffId }).delete()
    await audit(c, {
      action: "team.staff_removed",
      targetType: "StaffMember",
      targetId: staffId,
      data: { name: row.name },
    })
  })
}
