"use server"

import { revalidatePath } from "next/cache"
import { AppError } from "@/platform/errors"
import { requirePlatformRole } from "@/platform/staff"
import { enqueueJob } from "@/platform/jobs/runner"
import { restoreSnapshot, restoreInPlace } from "@/platform/backup/restore"
import { audit } from "@/platform/audit"
import { platformAuditContext } from "@/platform/audit"

/** Platform backup actions (task 8.4): request a snapshot (enqueues the
 * job) and restore-to-new (creates a fresh tenant from a bundle). */
export async function requestSnapshot(tenantId: string) {
  try {
    const { user } = await requirePlatformRole()
    await enqueueJob("platform.tenant.snapshot", { tenantId, requestedBy: user.id }, { tenantId })
    await audit(platformAuditContext(user.id, tenantId), {
      action: "backup.snapshot_requested",
      targetType: "Tenant",
      targetId: tenantId,
    })
    revalidatePath("/platform/backups")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function restoreToNewTenant(snapshotId: string) {
  try {
    const { user } = await requirePlatformRole()
    const result = await restoreSnapshot(snapshotId)
    await audit(platformAuditContext(user.id, result.newTenantId), {
      action: "backup.restored_to_new",
      targetType: "TenantSnapshot",
      targetId: snapshotId,
    })
    revalidatePath("/platform/backups")
    return result
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    return { error: "restore_failed" }
  }
}

/** In-place restore (task 12.3): the same bundle goes back onto the tenant
 * it came from — its rows are replaced by the snapshot's. Destructive on
 * purpose: the tenant asked to "put it back how it was". */
export async function restoreInPlaceAction(snapshotId: string) {
  try {
    const { user } = await requirePlatformRole()
    const { bundle } = await (await import("@/platform/backup/restore")).fetchBundle(snapshotId)
    const { rowCounts } = await restoreInPlace(bundle, bundle.tenantId)
    await audit(platformAuditContext(user.id, bundle.tenantId), {
      action: "backup.restored_in_place",
      targetType: "TenantSnapshot",
      targetId: snapshotId,
      data: { rows: Object.values(rowCounts).reduce((s, n) => s + n, 0) },
    })
    revalidatePath("/platform/backups")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    return { error: "restore_failed" }
  }
}
