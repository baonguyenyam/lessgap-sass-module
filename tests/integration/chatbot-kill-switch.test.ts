import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { NextRequest } from "next/server"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("@/platform/tenancy/host", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/host")>()
  return { ...mod, resolveHost: vi.fn() }
})
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})

const { POST } = await import("@/app/api/chat/route")
const { reindexNow } = await import("@/app/actions/chatbot")
const { resolveHost } = await import("@/platform/tenancy/host")
const { requireTenantContext } = await import("@/platform/tenancy/require-member")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `kill-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "K",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "KillCo", slug: `kill-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "chatbot", enabled: true })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "module.chatbot" },
    create: { key: "module.chatbot", value: true, updatedById: "test" },
    update: {},
  })
  await db8.orm.public.PlatformSwitch.upsert({
    conflictOn: { key: "feature.chatbot" },
    create: { key: "feature.chatbot", value: true, updatedById: "test" },
    update: {},
  })
  vi.mocked(resolveHost).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: tenant.slug })
  vi.mocked(requireTenantContext).mockResolvedValue({
    tenantId: tenant.id,
    user: { id: user.id },
    member: { role: "owner" },
  } as Awaited<ReturnType<typeof requireTenantContext>>)
  return { tenant, user }
}

describe("chatbot kill switches (7.4)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("feature.chatbot off → the API answers 403", async () => {
    const { tenant } = await provision()
    await db8.orm.public.PlatformSwitch.where({ key: "feature.chatbot" }).update({ value: false })
    const res = await POST(
      new NextRequest("http://site.test/api/chat", {
        method: "POST",
        headers: { host: "site.test", "content-type": "application/json" },
        body: JSON.stringify({ question: "hi", visitorKey: "v1" }),
      })
    )
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error: string }).error).toBe("forbidden")
    void tenant
  })

  it("feature.chatbot on → the API answers a message", async () => {
    await provision()
    const res = await POST(
      new NextRequest("http://site.test/api/chat", {
        method: "POST",
        headers: { host: "site.test", "content-type": "application/json" },
        body: JSON.stringify({ question: "hi there", visitorKey: "v1" }),
      })
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { answer: string; conversationId: string }
    expect(data.answer).toBeTruthy()
  })

  it("reindexNow enqueues the tenant's job", async () => {
    const { tenant } = await provision()
    const res = await reindexNow()
    expect(res.error).toBeUndefined()
    const job = await db8.orm.public.Job.where({ kind: "platform.chatbot.reindex" }).first()
    expect(job).not.toBeNull()
    expect((job!.payload as { tenantId: string }).tenantId).toBe(tenant.id)
  })
})
