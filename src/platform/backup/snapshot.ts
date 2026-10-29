import zlib from "node:zlib"
import { promisify } from "node:util"
import { db8 } from "@/lib/db8"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"
import { putObject, storageConfigured } from "@/platform/storage/r2"
import { nowTs } from "@/lib/timestamps"

const gzip = promisify(zlib.gzip)

/** Per-tenant backup (task 8.3, spec/16): every `tenant-owned` table's rows
 * for this tenant → one gzipped JSON bundle at
 * `snapshots/<tenantId>/<id>.json.gz` in R2. The `TenantSnapshot` row is the
 * audit: status, per-table row counts, size. */
const TENANT_MODELS = Object.entries(MODEL_CLASSIFICATION)
  .filter(([, c]) => c.kind === "tenant-owned")
  .map(([name]) => name)

export type SnapshotBundle = { tenantId: string; takenAt: string; tables: Record<string, unknown[]> }

export async function snapshotTenant(tenantId: string, requestedBy?: string): Promise<{ id: string; rows: number }> {
  const snapshot = await db8.orm.public.TenantSnapshot.create({ tenantId, requestedBy: requestedBy ?? null })
  try {
    const tables: Record<string, unknown[]> = {}
    const rowCounts: Record<string, number> = {}
    for (const model of TENANT_MODELS) {
      const rows = await (
        db8.orm.public as Record<string, { where: (w: { tenantId: string }) => { all: () => Promise<unknown[]> } }>
      )
        [model]!.where({ tenantId })
        .all()
      tables[model] = rows
      rowCounts[model] = rows.length
    }
    const bundle: SnapshotBundle = { tenantId, takenAt: new Date().toISOString(), tables }
    const compressed = await gzip(JSON.stringify(bundle))
    const key = `snapshots/${tenantId}/${snapshot.id}.json.gz`
    if (storageConfigured()) {
      await putObject(key, compressed, { contentType: "application/gzip" })
    }
    const total = Object.values(rowCounts).reduce((a, b) => a + b, 0)
    await db8.orm.public.TenantSnapshot.where({ id: snapshot.id }).update({
      status: "done",
      rowCounts,
      sizeBytes: compressed.length,
      r2Key: storageConfigured() ? key : null,
      completedAt: nowTs(),
    })
    return { id: snapshot.id, rows: total }
  } catch (error) {
    await db8.orm.public.TenantSnapshot.where({ id: snapshot.id }).update({
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    })
    throw error
  }
}
