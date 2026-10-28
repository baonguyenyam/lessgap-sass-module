import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, vars?: Record<string, unknown>) =>
    `${key}${vars ? ":" + JSON.stringify(vars) : ""}`,
}))
const memberContext = vi.fn()

vi.mock("@/platform/tenancy/require-member", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requireTenantContext: (resource?: string, verb?: string) => memberContext(resource, verb),
}))

const { saveSiteSettings } = await import("@/app/actions/site")

describe("site settings (3.3)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  async function provision() {
    const { user } = await auth.api.signUpEmail({
      body: {
        email: `site-${Date.now()}-${Math.random()}@example.test`,
        password: "correct horse battery staple",
        name: "O",
      },
    })
    const tenant = await auth.api.createOrganization({
      body: { name: "SiteCo", slug: `site-${Date.now()}`, userId: user.id },
    })
    await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
    return { user, tenant }
  }

  it("saves profile, hours and appearance; creates the Site row; audits", async () => {
    const { user, tenant } = await provision()
    memberContext.mockResolvedValue({ tenantId: tenant.id, user, member: { role: "owner" } })
    const result = await saveSiteSettings({
      name: "SiteCo HQ",
      tagline: "We build sites",
      phone: "+1 555 0100",
      email: "hi@site.co",
      address: "1 Main St",
      hours: { mon: "09:00-17:00", tue: "09:00-17:00" },
      accentColor: "#0ea5e9",
    })
    expect(result.error).toBeUndefined()
    const site = await db8.orm.public.Site.where({ tenantId: tenant.id }).first()
    expect(site?.themeKey).toBe("main")
    const settings = await db8.orm.public.SiteSettings.where({ tenantId: tenant.id }).first()
    expect((settings?.profile as { name?: string })?.name).toBe("SiteCo HQ")
    expect((settings?.hours as Record<string, string>)?.mon).toBe("09:00-17:00")
    expect((settings?.hours as Record<string, string>)?.tue).toBe("09:00-17:00")
    expect((settings?.appearance as { accentColor?: string })?.accentColor).toBe("#0ea5e9")
    const entry = await db8.orm.public.AuditLog.where({ action: "site.settings.saved", tenantId: tenant.id }).first()
    expect(entry).not.toBeNull()
  })

  it("rejects a missing name and bad hours", async () => {
    const { user, tenant } = await provision()
    memberContext.mockResolvedValue({ tenantId: tenant.id, user, member: { role: "owner" } })
    expect((await saveSiteSettings({ name: "  " })).error).toContain("nameRequired")
    expect((await saveSiteSettings({ name: "X", hours: { mon: "nope" } })).error).toContain("hoursInvalid")
    expect(await db8.orm.public.SiteSettings.where({ tenantId: tenant.id }).first()).toBeNull()
  })
})
