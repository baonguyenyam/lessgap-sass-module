"use server"

import { updateTag } from "next/cache"
import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { getEntitlements } from "@/platform/entitlements"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import type { TenantContext } from "@/platform/tenancy/context"

/** Catalog actions (task 4.2): categories, services, variants — tenant-owned
 * rows behind the `catalog` module and the `catalog.services.max` gate. */
async function ctx(): Promise<TenantContext> {
  const c = await requireTenantContext("catalog", "manage")
  return { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } }
}

async function guard(fn: (c: TenantContext) => Promise<unknown>): Promise<{ error?: string }> {
  try {
    const c = await ctx()
    await requireModule(c, "catalog")
    await fn(c)
    updateTag(`site:${c.tenantId}`)
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function addCategory(input: { name: string }) {
  return guard(async (c) => {
    if (!input.name.trim()) throw new AppError("invalid_input", { field: "name" })
    await db8.orm.public.ServiceCategory.create({ tenantId: c.tenantId, name: input.name.trim() })
    await audit(c, { action: "catalog.category_added", targetType: "ServiceCategory", data: { name: input.name } })
  })
}

export async function addService(input: {
  name: string
  durationMinutes?: number
  priceCents?: number
  categoryId?: string
}) {
  return guard(async (c) => {
    if (!input.name.trim()) throw new AppError("invalid_input", { field: "name" })
    const count = await db8.orm.public.Service.where({ tenantId: c.tenantId }).aggregate((a) => ({ n: a.count() }))
    const max = (await getEntitlements(c)).limit("catalog.services.max")
    if (max !== null && count.n + 1 > max) throw new AppError("feature_unavailable")
    await db8.orm.public.Service.create({
      tenantId: c.tenantId,
      name: input.name.trim(),
      categoryId: input.categoryId || null,
      durationMinutes: input.durationMinutes ?? 60,
      priceCents: input.priceCents ?? 0,
    })
    await audit(c, { action: "catalog.service_added", targetType: "Service", data: { name: input.name } })
  })
}

export async function deleteService(serviceId: string) {
  return guard(async (c) => {
    const row = await db8.orm.public.Service.where({ id: serviceId, tenantId: c.tenantId }).first()
    if (!row) throw new AppError("not_found")
    await db8.orm.public.ServiceVariant.where({ serviceId }).delete()
    await db8.orm.public.Service.where({ id: serviceId }).delete()
    await audit(c, {
      action: "catalog.service_removed",
      targetType: "Service",
      targetId: serviceId,
      data: { name: row.name },
    })
  })
}
