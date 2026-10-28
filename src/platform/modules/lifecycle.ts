import { db8, uniqueIndexKey } from "@/lib/db8"
import { nowTs, toDate, toTs } from "@/lib/timestamps"
import { AppError } from "@/platform/errors"
import { enqueueJob } from "@/platform/jobs/runner"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import { actingUserId, systemContext, type TenantContext } from "@/platform/tenancy/context"
import type { ModuleManifest } from "@/platform/modules/manifest-schema"
import { moduleRegistry } from "@/modules/registry"

const GRACE_DAYS = 7
const DAY_MS = 86_400_000

/**
 * The lifecycle writes behind the settings page (spec/15): purge scheduling,
 * cancellation, the purge job itself, and the export job. Enable/disable live
 * in runtime.ts — this file is the destructive half, which is why the purge
 * job is the only path that calls a module's `onPurge`.
 */

function manifest(key: string): ModuleManifest {
  const found = (moduleRegistry as Record<string, ModuleManifest>)[key]
  if (!found) throw new AppError("not_found")
  return found
}

/** Rows a purge deletes, for the confirmation screen and the audit entry. */
export async function describeModuleData(ctx: TenantContext, key: string): Promise<Record<string, number>> {
  const hook = manifest(key).lifecycle?.describeData as
    ((ctx: TenantContext) => Promise<Record<string, number>>) | undefined
  if (!hook) return {}
  return hook(ctx)
}

/** Whether a purge is already waiting out its grace period for this module. */
export async function pendingPurge(tenantId: string, key: string) {
  return db8.orm.public.ModulePurge.where({ tenantId, moduleKey: key, status: "scheduled" }).first()
}

/**
 * Schedules the 7-day-grace purge (spec/15, step 3): a `ModulePurge` row with
 * `runAfter = now + 7 days` and a `platform.module.purge` job. Refused while
 * the module is still enabled — disable first, data stays — and without the
 * module's exact name typed back.
 */
export async function scheduleModulePurge(
  ctx: TenantContext,
  key: string,
  typedName: string
): Promise<{ error?: string }> {
  const m = manifest(key)
  if (typedName.trim() !== m.name) return { error: "name_mismatch" }
  const row = await tenantDb(ctx, (db) => db.TenantModule.where({ moduleKey: key }).first())
  if (row?.enabled) throw new AppError("conflict", { field: "enabled" })
  if (await pendingPurge(ctx.tenantId, key)) throw new AppError("conflict", { field: "scheduled" })

  const counts = await describeModuleData(ctx, key)
  const purge = await db8.orm.public.ModulePurge.create({
    tenantId: ctx.tenantId,
    moduleKey: key,
    status: "scheduled",
    runAfter: toTs(new Date(Date.now() + GRACE_DAYS * DAY_MS)),
    counts,
  } as never)
  await enqueueJob("platform.module.purge", { purgeId: purge.id, tenantId: ctx.tenantId, moduleKey: key })
  await db8.orm.public.AuditLog.create({
    actorKind: "user",
    actorId: actingUserId(ctx) ?? "system",
    tenantId: ctx.tenantId,
    action: "module.purge.scheduled",
    targetType: "ModulePurge",
    targetId: purge.id,
    data: { moduleKey: key, counts },
  } as never)
  return {}
}

/** Cancels a scheduled purge inside its grace period (spec/15, step 4). */
export async function cancelModulePurge(ctx: TenantContext, key: string): Promise<void> {
  const purge = await pendingPurge(ctx.tenantId, key)
  if (!purge) return
  await db8.orm.public.ModulePurge.where({ id: purge.id }).update({ status: "canceled", canceledAt: nowTs() })
  await db8.orm.public.AuditLog.create({
    actorKind: "user",
    actorId: actingUserId(ctx) ?? "system",
    tenantId: ctx.tenantId,
    action: "module.purge.canceled",
    targetType: "ModulePurge",
    targetId: purge.id,
    data: { moduleKey: key },
  } as never)
}

/**
 * The purge job (spec/15, step 5): only after `runAfter`, calls `onPurge` in
 * batches until it reports zero remaining rows, then marks the row `done` and
 * resets the tenant's `TenantModule` as if never enabled. Idempotent — a
 * retried job continues where the last batch stopped, so deleting an already
 * gone row is the no-op it looks like.
 */
export async function runModulePurge(purgeId: string): Promise<void> {
  const purge = await db8.orm.public.ModulePurge.where({ id: purgeId }).first()
  if (!purge || purge.status !== "scheduled") return
  if (purge.runAfter && toDate(purge.runAfter) > new Date()) return

  const ctx = systemContext(purge.tenantId, "platform.module.purge")
  const m = manifest(purge.moduleKey)
  const hook = m.lifecycle?.onPurge as ((ctx: TenantContext, opts: { batch: number }) => Promise<number>) | undefined
  try {
    let remaining = hook ? await hook(ctx, { batch: 500 }) : 0
    let loops = 0
    while (remaining > 0 && loops++ < 1000) remaining = await hook!(ctx, { batch: 500 })

    await db8.orm.public.ModulePurge.where({ id: purge.id }).update({
      status: "done",
      counts: (await describeModuleData(ctx, purge.moduleKey)) ?? {},
    })
    // As if never enabled: the module can be enabled cleanly again later.
    await tenantDb(ctx, (db) =>
      db.TenantModule.where({ moduleKey: purge.moduleKey }).update({
        enabled: false,
        enabledAt: null,
        disabledAt: nowTs(),
        firstEnabledAt: null,
      })
    )
    await db8.orm.public.AuditLog.create({
      actorKind: "system",
      actorId: "platform.module.purge",
      tenantId: purge.tenantId,
      action: "module.purge.completed",
      targetType: "ModulePurge",
      targetId: purge.id,
      data: { moduleKey: purge.moduleKey },
    } as never)
  } catch (error) {
    await db8.orm.public.ModulePurge.where({ id: purge.id }).update({ status: "failed", error: String(error) })
    throw error
  }
}

/**
 * Queues an export for the tenant's own rows (spec/15): the `platform.module.export`
 * job calls `onExport`, which returns `{ name: content }` files; the download
 * link reads them back until `expiresAt` — 7 days.
 */
export async function requestModuleExport(ctx: TenantContext, key: string): Promise<{ exportId: string }> {
  manifest(key)
  const expiresAt = new Date(Date.now() + GRACE_DAYS * DAY_MS)
  const row = await db8.orm.public.ModuleExport.create({
    tenantId: ctx.tenantId,
    moduleKey: key,
    files: {},
    expiresAt: toTs(expiresAt),
  } as never)
  await enqueueJob("platform.module.export", { exportId: row.id, tenantId: ctx.tenantId, moduleKey: key })
  return { exportId: row.id }
}

export async function runModuleExport(exportId: string): Promise<void> {
  const row = await db8.orm.public.ModuleExport.where({ id: exportId }).first()
  if (!row) return
  const ctx = systemContext(row.tenantId, "platform.module.export")
  const hook = manifest(row.moduleKey).lifecycle?.onExport as
    ((ctx: TenantContext) => Promise<Record<string, unknown>>) | undefined
  const files = hook ? await hook(ctx) : {}
  await db8.orm.public.ModuleExport.where({ id: row.id }).update({ files: files as never })
  await db8.orm.public.AuditLog.create({
    actorKind: "system",
    actorId: "platform.module.export",
    tenantId: row.tenantId,
    action: "module.export.completed",
    targetType: "ModuleExport",
    targetId: row.id,
    data: { moduleKey: row.moduleKey, fileCount: Object.keys(files).length },
  } as never)
}
