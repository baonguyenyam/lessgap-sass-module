import { beforeEach, describe, expect, it, vi } from "vitest"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"

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
vi.mock("@/platform/tenancy/require-member", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/platform/tenancy/require-member")>()
  return { ...mod, requireTenantContext: vi.fn() }
})

const TENANT = "et-tenant"

describe("email template overrides", () => {
  beforeEach(resetDatabase)

  it("a saved override lands in TenantSetting; reset removes it", async () => {
    const { requireTenantContext } = await import("@/platform/tenancy/require-member")
    vi.mocked(requireTenantContext).mockResolvedValue({
      tenantId: TENANT,
      user: { id: "u1" },
      member: { role: "owner" },
    } as never)
    await db8.orm.public.Tenant.create({ id: TENANT, name: "ET", slug: "et", status: "ACTIVE" })

    const { saveEmailTemplate, resetEmailTemplate } = await import("@/app/actions/email-templates")
    const save = await saveEmailTemplate({
      templateKey: "booking.confirmation",
      locale: "en",
      subject: "Your booking at {business}",
      html: "<p>Hi {name}</p>",
    })
    expect("error" in save ? save.error : null).toBeNull()
    const row = await db8.orm.public.TenantSetting.where({
      tenantId: TENANT,
      key: "notify.template.booking.confirmation.en",
    }).first()
    expect((row?.value as { subject: string }).subject).toBe("Your booking at {business}")

    const reset = await resetEmailTemplate({ templateKey: "booking.confirmation", locale: "en" })
    expect("error" in reset ? reset.error : null).toBeNull()
    const after = await db8.orm.public.TenantSetting.where({
      tenantId: TENANT,
      key: "notify.template.booking.confirmation.en",
    }).first()
    expect(after).toBeNull()
  })
})
