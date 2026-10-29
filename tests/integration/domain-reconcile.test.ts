import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { reconcileDomains } from "@/platform/domains/reconcile"

vi.mock("@/platform/domains/provider", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/domains/provider")>()
  return { ...mod, domainProvider: vi.fn() }
})
const { domainProvider } = await import("@/platform/domains/provider")

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
  return { tenant }
}

describe("reconcileDomains (8.2)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("a domain the provider lost and a provider hostname no row claims both surface", async () => {
    const { tenant } = await provision()
    await db8.orm.public.Domain.create({ tenantId: tenant.id, hostname: "ours.example.test", status: "active" })
    vi.mocked(domainProvider).mockReturnValue({
      addDomain: vi.fn(),
      checkDomain: vi.fn(),
      removeDomain: vi.fn(),
      listDomains: vi.fn(async () => ["theirs.example.test"]),
    })
    const res = await reconcileDomains()
    expect(res.missing).toBe(1)
    expect(res.extra).toBe(1)
    const checks = await db8.orm.public.DomainCheck.where({ runId: res.runId }).all()
    expect(checks).toHaveLength(2)
    expect(checks.find((c) => c.kind === "missing_provider")?.hostname).toBe("ours.example.test")
    expect(checks.find((c) => c.kind === "extra_provider")?.hostname).toBe("theirs.example.test")
  })

  it("a matching set writes nothing", async () => {
    const { tenant } = await provision()
    await db8.orm.public.Domain.create({ tenantId: tenant.id, hostname: "same.example.test", status: "active" })
    vi.mocked(domainProvider).mockReturnValue({
      addDomain: vi.fn(),
      checkDomain: vi.fn(),
      removeDomain: vi.fn(),
      listDomains: vi.fn(async () => ["same.example.test"]),
    })
    const res = await reconcileDomains()
    expect(res.missing).toBe(0)
    expect(res.extra).toBe(0)
  })

  it("a provider without listDomains skips instead of guessing", async () => {
    await provision()
    vi.mocked(domainProvider).mockReturnValue({
      addDomain: vi.fn(),
      checkDomain: vi.fn(),
      removeDomain: vi.fn(),
    })
    const res = await reconcileDomains()
    expect(res.runId).toBe("")
    const checks = await db8.orm.public.DomainCheck.all()
    expect(checks).toHaveLength(0)
  })
})
