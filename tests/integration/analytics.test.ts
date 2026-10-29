import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Map()), cookies: vi.fn(async () => ({})) }))
const { resolveHost } = await vi.importActual<typeof import("@/platform/tenancy/host")>("@/platform/tenancy/host")
vi.mock("@/platform/tenancy/host", () => ({ ...resolveHost, resolveHost: vi.fn() }))
const { POST } = await import("@/app/api/view/route")
const { resolveHost: mocked } = await import("@/platform/tenancy/host")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `anl-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "A",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "AnCo", slug: `anl-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { tenant }
}

import type { NextRequest } from "next/server"
function req(host: string, path = "/") {
  return new Request("http://test/api/view", {
    method: "POST",
    headers: { host, "content-type": "application/json" },
    body: JSON.stringify({ path }),
  }) as unknown as NextRequest
}

/** Site analytics beacon (8.7): POST /api/view upserts the tenant's
 * path+day counter — a second view increments, module-off returns 403. */
describe("POST /api/view (8.7)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a view creates the counter; a second view increments it", async () => {
    const { tenant } = await provision()
    await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "analytics", enabled: true })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.analytics" },
      create: { key: "module.analytics", value: true },
      update: {},
    })
    vi.mocked(mocked).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: "anl" })
    const date = new Date().toISOString().slice(0, 10)
    let res = await POST(req("anl.lessgap.io", "/about"))
    expect(res.status).toBe(200)
    res = await POST(req("anl.lessgap.io", "/about"))
    expect(res.status).toBe(200)
    const row = await db8.orm.public.SitePageView.where({ tenantId: tenant.id, path: "/about", date }).first()
    expect(row).not.toBeNull()
    expect(row!.count).toBe(2)
  })

  it("a non-site host 404s; module disabled 403s", async () => {
    const { tenant } = await provision()
    vi.mocked(mocked).mockResolvedValue({ kind: "none" })
    let res = await POST(req("unknown.lessgap.io"))
    expect(res.status).toBe(404)
    vi.mocked(mocked).mockResolvedValue({ kind: "site", tenantId: tenant.id, slug: "anl" })
    await db8.orm.public.PlatformSwitch.upsert({
      conflictOn: { key: "module.analytics" },
      create: { key: "module.analytics", value: false },
      update: {},
    })
    await db8.orm.public.TenantModule.create({ tenantId: tenant.id, moduleKey: "analytics", enabled: false })
    res = await POST(req("anl.lessgap.io"))
    expect(res.status).toBe(403)
  })
})
