import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"
import { snapshotTenant } from "@/platform/backup/snapshot"

vi.mock("@/platform/storage/r2", () => ({
  storageConfigured: vi.fn(() => false),
  putObject: vi.fn(async () => {}),
}))
const { putObject } = await import("@/platform/storage/r2")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `snap-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "S",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "SnapCo", slug: `snap-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { tenant }
}

/** O5 (task 8.3): a snapshot produces a bundle covering every tenant-owned
 * table — the TenantSnapshot row records status + per-table counts. */
describe("snapshotTenant (8.3, O5)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("the snapshot row records every tenant-owned table's row count", async () => {
    const { tenant } = await provision()
    await db8.orm.public.Customer.create({ tenantId: tenant.id, name: "Ana", email: "ana@x.test" })
    const res = await snapshotTenant(tenant.id, "staff-1")
    const snapshot = await db8.orm.public.TenantSnapshot.where({ id: res.id }).first()
    expect(snapshot).not.toBeNull()
    expect(snapshot!.status).toBe("done")
    const counts = snapshot!.rowCounts as Record<string, number>
    const tenantModels = Object.entries(MODEL_CLASSIFICATION)
      .filter(([, c]) => c.kind === "tenant-owned")
      .map(([n]) => n)
    // Every tenant-owned table is in the count map — snapshot coverage is
    // total, not a picked list.
    for (const model of tenantModels) {
      expect(counts, `missing ${model}`).toHaveProperty(model)
    }
    expect(counts.Customer).toBe(1)
    expect(res.rows).toBeGreaterThan(0)
  })

  it("a second tenant's rows never enter the bundle", async () => {
    const { tenant } = await provision()
    const other = await provision()
    await db8.orm.public.Customer.create({ tenantId: other.tenant.id, name: "Theirs", email: "theirs@x.test" })
    const res = await snapshotTenant(tenant.id)
    const snapshot = await db8.orm.public.TenantSnapshot.where({ id: res.id }).first()
    const counts = snapshot!.rowCounts as Record<string, number>
    expect(counts.Customer).toBe(0)
  })

  it("storage configured → the bundle uploads under snapshots/<tenantId>/", async () => {
    const { tenant } = await provision()
    const { storageConfigured } = await import("@/platform/storage/r2")
    vi.mocked(storageConfigured).mockReturnValue(true)
    const res = await snapshotTenant(tenant.id)
    expect(vi.mocked(putObject)).toHaveBeenCalledWith(`snapshots/${tenant.id}/${res.id}.json.gz`, expect.anything(), {
      contentType: "application/gzip",
    })
  })
})
