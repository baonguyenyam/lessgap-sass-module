import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

const sessionHeaders = { current: new Headers() }
vi.mock("next/headers", () => ({ headers: async () => sessionHeaders.current }))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const { startOnboarding } = await import("@/app/actions/onboarding")

async function signedIn() {
  const email = `ob-${Date.now()}-${Math.random()}@example.test`
  const { headers } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: "Owner" },
    returnHeaders: true,
  })
  sessionHeaders.current = new Headers({ cookie: headers.get("set-cookie")!.split(";")[0] })
  return { email }
}

describe("onboarding wizard (4.5)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("creates the tenant, applies the vertical's preset, and creates its site", async () => {
    await signedIn()
    const result = await startOnboarding({ name: "Nail Bar", slug: "nailbar", vertical: "nail_salon" })
    expect(result.error).toBeUndefined()
    expect(result.slug).toBe("nailbar")

    const tenant = await db8.orm.public.Tenant.where({ slug: "nailbar" }).first()
    expect(tenant).not.toBeNull()
    expect(tenant!.status).toBe("ACTIVE")

    // The vertical wrote its sample rows + terminology setting + modules.
    const services = await db8.orm.public.Service.where({ tenantId: tenant!.id }).all()
    expect(services.length).toBeGreaterThan(0)
    expect(services.every((s) => s.isSample)).toBe(true)
    const term = await db8.orm.public.TenantSetting.where({ tenantId: tenant!.id, key: "vertical.terminology" }).first()
    expect((term!.value as { staff: string }).staff).toBe("technician")
    const modules = await db8.orm.public.TenantModule.where({ tenantId: tenant!.id, enabled: true }).all()
    expect(modules.map((m) => m.moduleKey).sort()).toEqual(["catalog", "newsletter", "team"])

    const site = await db8.orm.public.Site.where({ tenantId: tenant!.id }).first()
    expect(site).not.toBeNull()
    const settings = await db8.orm.public.SiteSettings.where({ tenantId: tenant!.id }).first()
    expect((settings!.profile as { name: string }).name).toBe("Nail Bar")
  })

  it("a second call is refused — the user already has a tenant", async () => {
    await signedIn()
    await startOnboarding({ name: "One", slug: "one", vertical: "generic" })
    const again = await startOnboarding({ name: "Two", slug: "two", vertical: "generic" })
    expect(again.error).toBe("already_has_tenant")
  })
})
