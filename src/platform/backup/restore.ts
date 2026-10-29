import zlib from "node:zlib"
import { promisify } from "node:util"
import { sql } from "kysely"
import { db8 } from "@/lib/db8"
import { authDb } from "@/lib/kysely"
import { newId } from "@/lib/ids"
import { downloadObject, storageConfigured } from "@/platform/storage/r2"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"
import type { SnapshotBundle } from "@/platform/backup/snapshot"

const gunzip = promisify(zlib.gunzip)

/** Restore-to-new (task 8.4, spec/16): the bundle is imported into a fresh
 * tenant — every row's `id` is remapped through one map so old and new
 * never collide, and any field whose value is a mapped id follows (FK
 * rewrite). The original tenant is untouched. In-place restore is a later
 * decision — it needs ordering and conflict rules per module. */
const TENANT_MODELS = Object.entries(MODEL_CLASSIFICATION)
  .filter(([, c]) => c.kind === "tenant-owned")
  .map(([name]) => name)

/** `Json` fields per contract.prisma — db8 hands them back parsed (a plain
 * string where the JSON is a scalar), and an insert needs them serialized
 * again or Postgres rejects the row (`invalid input syntax for type json`). */
const JSON_FIELDS: Record<string, Set<string>> = {
  AuditLog: new Set(["data"]),
  ChatMessage: new Set(["sourcesJson"]),
  Domain: new Set(["verification"]),
  EmailMessage: new Set(["payload"]),
  EntitlementOverride: new Set(["value"]),
  ModulePurge: new Set(["counts"]),
  NotificationLog: new Set(["payload"]),
  OrderLine: new Set(["modifiers"]),
  Page: new Set(["content"]),
  PlatformSwitch: new Set(["value"]),
  Site: new Set(["tokens", "sections", "languages"]),
  SiteSettings: new Set(["profile", "hours", "appearance"]),
  Tenant: new Set(["metadata"]),
  TenantModule: new Set(["settings"]),
  TenantSetting: new Set(["value"]),
  UserSetting: new Set(["value"]),
  TenantSnapshot: new Set(["rowCounts"]),
}

export async function restoreBundle(
  bundle: SnapshotBundle,
  newTenantId: string,
  preserveIds = false
): Promise<{ rowCounts: Record<string, number> }> {
  // Pass 1 — every source id maps to a fresh id (the map is complete before
  // any write, so a field rewritten in pass 2 always resolves). `preserveIds`
  // keeps the snapshot's own ids — an in-place restore inserts what it
  // deleted (task 12.3).
  const idMap = new Map<string, string>()
  for (const model of TENANT_MODELS) {
    for (const row of bundle.tables[model] ?? []) {
      const id = (row as { id?: string }).id
      if (id) idMap.set(id, preserveIds ? id : newId())
    }
  }
  const rowCounts: Record<string, number> = {}
  await authDb.transaction().execute(async (tx) => {
    // session_replication_role=replica suspends FK triggers for the session,
    // so insert order can't violate a child→parent edge mid-import.
    await sql`SET LOCAL session_replication_role = replica`.execute(tx)
    for (const model of TENANT_MODELS) {
      const rows = bundle.tables[model] ?? []
      rowCounts[model] = rows.length
      for (const source of rows) {
        const row = { ...(source as Record<string, unknown>) }
        for (const [field, value] of Object.entries(row)) {
          if (field === "tenantId") row[field] = newTenantId
          else if (field === "id") row[field] = idMap.get(value as string) ?? value
          else if (typeof value === "string" && idMap.has(value)) row[field] = idMap.get(value)
          // db8 returns Json (incl. scalar JSON as plain strings) and
          // vector fields as parsed values; the insert needs them back on
          // the wire serialized.
          else if (value !== null && (JSON_FIELDS[model]?.has(field) || typeof value === "object"))
            row[field] = JSON.stringify(value)
        }
        await tx
          .insertInto(model as never)
          .values(row as never)
          .execute()
      }
    }
  })
  return { rowCounts }
}

/** Console restore: fetch the bundle from R2, create a fresh tenant, import. */
export async function restoreSnapshot(snapshotId: string): Promise<{ newTenantId: string }> {
  const snapshot = await db8.orm.public.TenantSnapshot.where({ id: snapshotId }).first()
  if (!snapshot || snapshot.status !== "done" || !snapshot.r2Key || !storageConfigured()) {
    throw new Error("snapshot not restorable")
  }
  const bytes = await downloadObject(snapshot.r2Key)
  const bundle = JSON.parse((await gunzip(bytes)).toString()) as SnapshotBundle
  const source = await db8.orm.public.Tenant.where({ id: bundle.tenantId }).first()
  const tenant = await db8.orm.public.Tenant.create({
    name: `${source?.name ?? "Tenant"} (restored)`,
    slug: `${source?.slug ?? "tenant"}-restored-${newId().slice(0, 6).toLowerCase()}`,
    status: "ACTIVE",
  })
  await restoreBundle(bundle, tenant.id)
  return { newTenantId: tenant.id }
}

/**
 * In-place restore (task 12.3): same bundle, same tenant — clear the
 * tenant's own rows, then insert the snapshot's with their original ids
 * (no remap — the snapshot is the tenant's own state). FK triggers are
 * suspended so the clear/insert order doesn't matter.
 */
export async function restoreInPlace(
  bundle: SnapshotBundle,
  tenantId: string
): Promise<{ rowCounts: Record<string, number> }> {
  const rowCounts: Record<string, number> = {}
  await authDb.transaction().execute(async (tx) => {
    await sql`SET LOCAL session_replication_role = replica`.execute(tx)
    for (const model of TENANT_MODELS) {
      await sql`DELETE FROM ${sql.ref(model)} WHERE ${sql.ref("tenantId")} = ${tenantId}`.execute(tx)
      const rows = bundle.tables[model] ?? []
      rowCounts[model] = rows.length
      for (const source of rows) {
        const row: Record<string, unknown> = { ...(source as Record<string, unknown>), tenantId }
        for (const [field, value] of Object.entries(row)) {
          if (value !== null && (JSON_FIELDS[model]?.has(field) || typeof value === "object"))
            row[field] = JSON.stringify(value)
        }
        await tx
          .insertInto(model as never)
          .values(row as never)
          .execute()
      }
    }
  })
  return { rowCounts }
}

/** Fetch a snapshot's bundle from R2 — the shared half of the two restore
 * paths (restoreSnapshot's restore-to-new and restoreInPlaceAction's
 * in-place). */
export async function fetchBundle(snapshotId: string): Promise<{ bundle: SnapshotBundle }> {
  const snapshot = await db8.orm.public.TenantSnapshot.where({ id: snapshotId }).first()
  if (!snapshot || snapshot.status !== "done" || !snapshot.r2Key || !storageConfigured()) {
    throw new Error("snapshot not restorable")
  }
  const bytes = await downloadObject(snapshot.r2Key)
  const bundle = JSON.parse((await gunzip(bytes)).toString()) as SnapshotBundle
  return { bundle }
}
