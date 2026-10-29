import { db8 } from "@/lib/db8"
import { audit } from "@/platform/audit"
import { uniqueIndexKey } from "@/lib/db8"
import { getVertical } from "@/verticals"
import type { TenantContext } from "@/platform/tenancy/context"

/**
 * Apply a vertical (spec/06): write ordinary rows once — terminology into the
 * tenant's settings, suggested modules on, sample services and staff marked
 * `isSample`. It is never re-consulted at runtime; only `terminology`
 * persists in settings.
 */
export async function applyVertical(ctx: TenantContext, verticalKey: string) {
  const v = getVertical(verticalKey)
  await db8.orm.public.TenantSetting.upsert({
    conflictOn: uniqueIndexKey({ tenantId: ctx.tenantId, key: "vertical.key" }),
    create: { tenantId: ctx.tenantId, key: "vertical.key", value: v.key },
    update: { value: v.key },
  })
  await db8.orm.public.TenantSetting.upsert({
    conflictOn: uniqueIndexKey({ tenantId: ctx.tenantId, key: "vertical.terminology" }),
    create: { tenantId: ctx.tenantId, key: "vertical.terminology", value: v.terminology },
    update: { value: v.terminology },
  })
  for (const [key, on] of Object.entries(v.modules)) {
    if (!on) continue
    await db8.orm.public.TenantModule.upsert({
      conflictOn: uniqueIndexKey({ tenantId: ctx.tenantId, moduleKey: key }),
      create: { tenantId: ctx.tenantId, moduleKey: key, enabled: true },
      update: { enabled: true },
    })
  }
  for (const name of v.sampleData.serviceCategories) {
    await db8.orm.public.ServiceCategory.create({ tenantId: ctx.tenantId, name })
  }
  for (const s of v.sampleData.services) {
    const category = s.category
      ? await db8.orm.public.ServiceCategory.where({ tenantId: ctx.tenantId, name: s.category }).first()
      : null
    await db8.orm.public.Service.create({
      tenantId: ctx.tenantId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      categoryId: category?.id ?? null,
      isSample: true,
    })
  }
  for (const name of v.sampleData.staff) {
    await db8.orm.public.StaffMember.create({ tenantId: ctx.tenantId, name, isSample: true })
  }
  await audit(ctx, { action: "vertical.applied", targetType: "Tenant", targetId: ctx.tenantId, data: { key: v.key } })
  return v
}

/** The one-click sample-data cleanup (spec/06): delete rows a vertical
 * wrote — only those marked `isSample`. */
export async function removeSampleData(ctx: TenantContext) {
  await db8.orm.public.Service.where({ tenantId: ctx.tenantId, isSample: true }).deleteAndCount()
  await db8.orm.public.StaffMember.where({ tenantId: ctx.tenantId, isSample: true }).deleteAndCount()
  await audit(ctx, { action: "vertical.samples_removed", targetType: "Tenant", targetId: ctx.tenantId, data: {} })
}
