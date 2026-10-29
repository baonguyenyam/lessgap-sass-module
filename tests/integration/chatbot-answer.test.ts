import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { systemContext } from "@/platform/tenancy/context"
import { answerChat } from "@/platform/chatbot/answer"
import { reindexTenant } from "@/platform/chatbot/ingest"
import { AppError } from "@/platform/errors"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `ans-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "A",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "BotCo", slug: `bot-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "chatbot", enabled: true })
  return { tenant, user }
}

describe("answerChat (7.3)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("answers from retrieved chunks and logs the conversation", async () => {
    const { tenant } = await provision()
    const c = systemContext(tenant.id, "customer")
    await db8.orm.public.Page.create({
      tenantId: tenant.id,
      key: "p",
      title: "Policies",
      content: "Refunds within 30 days.",
      status: "published",
    })
    await reindexTenant(tenant.id)
    const res = await answerChat(c, { question: "tell me about this place", visitorKey: "v1" })
    expect(res.answer).toBeTruthy()
    const conversation = await db8.orm.public.ChatConversation.where({ tenantId: tenant.id, visitorKey: "v1" }).first()
    expect(conversation).not.toBeNull()
    const messages = await db8.orm.public.ChatMessage.where({
      tenantId: tenant.id,
      conversationId: conversation!.id,
    }).all()
    expect(messages).toHaveLength(2)
  })

  it("a price answer comes from get_services — change the price, the answer changes, no re-index", async () => {
    const { tenant } = await provision()
    const c = systemContext(tenant.id, "customer")
    const service = await db8.orm.public.Service.create({
      tenantId: tenant.id,
      name: "Mani",
      priceCents: 2800,
      status: "active",
    })
    const first = await answerChat(c, { question: "how much do services cost", visitorKey: "v1" })
    expect(first.answer).toContain("28.00")
    expect(first.sources).toContain("get_services")
    // Change the price — no re-index, the tool reads live data.
    await db8.orm.public.Service.where({ id: service.id }).update({ priceCents: 3500 })
    const second = await answerChat(c, { question: "how much do services cost", visitorKey: "v1" })
    expect(second.answer).toContain("35.00")
  })

  it("the monthly cap refuses past the limit", async () => {
    const { tenant } = await provision()
    const c = systemContext(tenant.id, "customer")
    await db8.orm.public.EntitlementOverride.create({
      tenantId: tenant.id,
      featureKey: "chatbot.messages.monthly",
      value: 2,
      reason: "test",
      createdById: "test",
    })
    await answerChat(c, { question: "one", visitorKey: "v1" })
    await answerChat(c, { question: "two", visitorKey: "v1" })
    await expect(answerChat(c, { question: "three", visitorKey: "v1" })).rejects.toBeInstanceOf(AppError)
  })

  it("retrieval stays inside the tenant — same text, two tenants", async () => {
    const { tenant } = await provision()
    const other = await provision()
    const c = systemContext(tenant.id, "customer")
    await db8.orm.public.Page.create({
      tenantId: other.tenant.id,
      key: "p",
      title: "Theirs",
      content: "their secret content",
      status: "published",
    })
    await reindexTenant(other.tenant.id)
    const res = await answerChat(c, { question: "tell me about secrets", visitorKey: "v1" })
    // Their chunk may score but never ranks into my retrieval set —
    // the query filters by tenantId first.
    const myChunks = await db8.orm.public.KnowledgeChunk.where({ tenantId: tenant.id }).all()
    expect(myChunks).toHaveLength(0)
    expect(res.sources.every((s) => s !== "Theirs")).toBe(true)
  })
})
