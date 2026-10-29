import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { reindexTenant } from "@/platform/chatbot/ingest"
import { resetDatabase } from "@tests/helpers/db"

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `cb-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "C",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "BotCo", slug: `bot-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "chatbot", enabled: true })
  return { tenant }
}

describe("reindexTenant (7.2)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("creates chunks from a tenant's pages, keyed by that tenant", async () => {
    const { tenant } = await provision()
    await db8.orm.public.Page.create({
      tenantId: tenant.id,
      key: "about",
      title: "About us",
      content: "We are a small studio. We do hair and nails.",
      status: "published",
    })
    const result = await reindexTenant(tenant.id)
    expect(result.sources).toBe(1)
    expect(result.chunks).toBeGreaterThanOrEqual(1)
    const chunks = await db8.orm.public.KnowledgeChunk.where({ tenantId: tenant.id }).all()
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    expect(chunks[0]!.tenantId).toBe(tenant.id)
    expect(chunks[0]!.embedding).not.toBeNull()
  })

  it("an unchanged checksum is a no-op; a changed one re-embeds", async () => {
    const { tenant } = await provision()
    const page = await db8.orm.public.Page.create({
      tenantId: tenant.id,
      key: "about",
      title: "About us",
      content: "Version one.",
      status: "published",
    })
    await reindexTenant(tenant.id)
    const first = await db8.orm.public.KnowledgeChunk.where({ tenantId: tenant.id }).all()
    // Same content → no new chunks, same ids.
    const again = await reindexTenant(tenant.id)
    expect(again.chunks).toBe(0)
    const second = await db8.orm.public.KnowledgeChunk.where({ tenantId: tenant.id }).all()
    expect(second.map((c) => c.id).sort()).toEqual(first.map((c) => c.id).sort())
    // Changed content → new chunk ids.
    await db8.orm.public.Page.where({ id: page.id }).update({ content: "Version two is different." })
    const third = await reindexTenant(tenant.id)
    expect(third.chunks).toBeGreaterThanOrEqual(1)
    const after = await db8.orm.public.KnowledgeChunk.where({ tenantId: tenant.id }).all()
    expect(after.map((c) => c.id)).not.toEqual(first.map((c) => c.id))
    expect(after[0]!.content).toContain("Version two")
  })

  it("a tenant's FAQ entries index alongside its pages", async () => {
    const { tenant } = await provision()
    await db8.orm.public.TenantSetting.create({
      tenantId: tenant.id,
      key: "chatbot.faq",
      value: [{ q: "Do you take walk-ins?", a: "Yes, until 5pm." }],
    })
    const result = await reindexTenant(tenant.id)
    expect(result.sources).toBe(1)
    const source = await db8.orm.public.KnowledgeSource.where({ tenantId: tenant.id, type: "faq" }).first()
    expect(source).not.toBeNull()
  })

  it("another tenant's pages never index into mine", async () => {
    const { tenant } = await provision()
    const other = await provision()
    await db8.orm.public.Page.create({ tenantId: other.tenant.id, key: "x", title: "Theirs", content: "theirs only" })
    await reindexTenant(other.tenant.id)
    const mine = await db8.orm.public.KnowledgeChunk.where({ tenantId: tenant.id }).all()
    expect(mine).toHaveLength(0)
  })
})
