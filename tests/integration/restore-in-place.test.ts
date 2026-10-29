import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import type { SnapshotBundle } from "@/platform/backup/snapshot"

vi.mock("next/headers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/headers")>()
  return { ...mod, headers: async () => new Headers() }
})
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const TENANT = "rip-tenant"

describe("in-place restore (12.3)", () => {
  beforeEach(resetDatabase)

  it("mutate → restoreInPlace → the pre-snapshot state returns", async () => {
    await db8.orm.public.Tenant.create({ id: TENANT, name: "Restore Co", slug: "rip", status: "ACTIVE" })
    const svc = await db8.orm.public.Service.create({
      tenantId: TENANT,
      name: "Massage",
      durationMinutes: 60,
      priceCents: 5000,
      currency: "usd",
    })
    const site = await db8.orm.public.Site.create({ tenantId: TENANT, themeKey: "classic", status: "PUBLISHED" })

    const bundle: SnapshotBundle = {
      tenantId: TENANT,
      tables: {
        Service: [
          { id: svc.id, tenantId: TENANT, name: "Massage", durationMinutes: 60, priceCents: 5000, currency: "usd" },
        ],
        Site: [{ id: site.id, tenantId: TENANT, themeKey: "classic", status: "PUBLISHED" }],
      },
    } as unknown as SnapshotBundle

    // Mutate: delete the service, create a new one, unpublish the site.
    await db8.orm.public.Service.where({ id: svc.id }).delete()
    await db8.orm.public.Service.create({
      tenantId: TENANT,
      name: "New",
      durationMinutes: 30,
      priceCents: 1,
      currency: "usd",
    })
    await db8.orm.public.Site.where({ id: site.id }).update({ status: "DRAFT" })

    const { restoreInPlace } = await import("@/platform/backup/restore")
    await restoreInPlace(bundle, TENANT)

    const services = await db8.orm.public.Service.where({ tenantId: TENANT }).all()
    expect(services.length).toBe(1)
    expect(services[0].id).toBe(svc.id)
    expect(services[0].name).toBe("Massage")
    const siteAfter = await db8.orm.public.Site.where({ id: site.id }).first()
    expect(siteAfter?.status).toBe("PUBLISHED")
  })
})
