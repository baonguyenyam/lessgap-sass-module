import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { resolveHost } from "@/platform/tenancy/host"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const { addDomain, checkDomain, setPrimaryDomain, primaryDomain } = await import("@/platform/domains")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `dom-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "D",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "DomCo", slug: `dom-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { user, tenant, ctx: systemContext(tenant.id, "test") }
}

describe("custom domains (3.7)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("add → pending with DNS records, check → status, resolveHost sees an active domain", async () => {
    const { tenant, ctx } = await provision()
    const row = await addDomain(ctx, "shop.example.com")
    expect(row.status).toBe("pending")
    expect((row.verification as { records: { type: string }[] }).records).toHaveLength(1)

    // The local provider stays pending; flip it active as the verify job would.
    const res = await checkDomain(ctx, "shop.example.com")
    expect(res.status).toBe("pending")
    await db8.orm.public.Domain.where({ id: row.id }).update({ status: "active" })

    // resolveHost now resolves the hostname to the tenant (not the sites domain).
    const resolved = await resolveHost("shop.example.com")
    expect(resolved.kind).toBe("site")
    expect((resolved as { tenantId: string }).tenantId).toBe(tenant.id)
  })

  it("setPrimaryDomain marks one active domain; primaryDomain returns it", async () => {
    const { ctx, tenant } = await provision()
    await addDomain(ctx, "one.example.com")
    await addDomain(ctx, "two.example.com")
    await db8.orm.public.Domain.where({ hostname: "one.example.com" }).update({ status: "active" })
    await db8.orm.public.Domain.where({ hostname: "two.example.com" }).update({ status: "active" })
    await setPrimaryDomain(ctx, "two.example.com")
    expect(await primaryDomain(tenant.id)).toBe("two.example.com")
    const one = await db8.orm.public.Domain.where({ hostname: "one.example.com" }).first()
    expect(one?.isPrimary).toBe(false)
  })

  it("a pending domain does not resolve", async () => {
    const { ctx } = await provision()
    await addDomain(ctx, "wait.example.com")
    expect(await resolveHost("wait.example.com")).toEqual({ kind: "none" })
  })
})
