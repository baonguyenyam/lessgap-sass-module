import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { buildBundle } from "@/platform/backup/snapshot"
import { restoreBundle } from "@/platform/backup/restore"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("@/platform/storage/r2", () => ({ storageConfigured: vi.fn(() => false), putObject: vi.fn() }))

async function provision(name: string) {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `rst-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "R",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name, slug: `rst-${name.toLowerCase()}-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { tenant }
}

/** O6 (task 8.4): snapshot tenant A → restore-to-new tenant B → every
 * tenant-owned table's row count matches, every id differs, and tenant A
 * is untouched. */
describe("restoreBundle (8.4, O6)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a restored tenant reproduces every table with new ids, source untouched", async () => {
    const { tenant: a } = await provision("Alpha")
    // Rows across several tables, including an FK chain (Source → Chunk).
    const customer = await db8.orm.public.Customer.create({ tenantId: a.id, name: "Ana", email: "ana@x.test" })
    const page = await db8.orm.public.Page.create({
      tenantId: a.id,
      key: "p",
      title: "P",
      content: "hello",
      status: "published",
    })
    const source = await db8.orm.public.KnowledgeSource.create({
      tenantId: a.id,
      type: "faq",
      title: "FAQ",
      checksum: "c1",
    })
    const chunk = await db8.orm.public.KnowledgeChunk.create({
      tenantId: a.id,
      sourceId: source.id,
      content: "hours 9-5",
      tokenCount: 3,
    })
    const { bundle } = await buildBundle(a.id)
    const { tenant: b } = await provision("Beta")

    const { rowCounts } = await restoreBundle(bundle, b.id)

    // Row counts per table match the source's.
    const bCustomers = await db8.orm.public.Customer.where({ tenantId: b.id }).all()
    const bPages = await db8.orm.public.Page.where({ tenantId: b.id }).all()
    const bSources = await db8.orm.public.KnowledgeSource.where({ tenantId: b.id }).all()
    const bChunks = await db8.orm.public.KnowledgeChunk.where({ tenantId: b.id }).all()
    expect(bCustomers).toHaveLength(1)
    expect(bPages).toHaveLength(1)
    expect(bSources).toHaveLength(1)
    expect(bChunks).toHaveLength(1)

    // Every id is new — no collision with the source's rows.
    expect(bCustomers[0]!.id).not.toBe(customer.id)
    expect(bPages[0]!.id).not.toBe(page.id)
    expect(bSources[0]!.id).not.toBe(source.id)
    expect(bChunks[0]!.id).not.toBe(chunk.id)
    // ...and the FK followed the map — B's chunk points at B's source.
    expect(bChunks[0]!.sourceId).toBe(bSources[0]!.id)
    expect(bChunks[0]!.tenantId).toBe(b.id)

    // Tenant A is untouched — same rows, same ids.
    const aCustomers = await db8.orm.public.Customer.where({ tenantId: a.id }).all()
    expect(aCustomers[0]!.id).toBe(customer.id)
    expect(aCustomers[0]!.email).toBe("ana@x.test")

    // rowCounts covers every tenant-owned table.
    const tenantModels = Object.entries(MODEL_CLASSIFICATION)
      .filter(([, c]) => c.kind === "tenant-owned")
      .map(([n]) => n)
    for (const model of tenantModels) expect(rowCounts).toHaveProperty(model)
  })
})
