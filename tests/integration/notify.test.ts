import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { resetDatabase } from "@tests/helpers/db"

vi.mock("@/lib/email-transport", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/email-transport")>()
  return { ...mod, sendEmail: vi.fn(async () => true) }
})

const { notify, renderTemplate } = await import("@/platform/notify")
const { sendEmail } = await import("@/lib/email-transport")

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `nt-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "N",
    },
  })
  const tenant = await auth.api.createOrganization({ body: { name: "NCo", slug: `nt-${Date.now()}`, userId: user.id } })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { tenant, ctx: systemContext(tenant.id, "test") }
}

describe("notify (5.6)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("renders the code default, sends, and logs in NotificationLog", async () => {
    const { tenant, ctx } = await provision()
    await notify(ctx, "booking.confirmation", "a@x.test", {
      name: "Ana",
      service: "Mani",
      staff: "Mia",
      time: "15:00",
      manageUrl: "https://x",
    })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@x.test", subject: "Booking confirmed: Mani" })
    )
    const log = await db8.orm.public.NotificationLog.where({ tenantId: tenant.id }).first()
    expect(log).not.toBeNull()
    expect(log!.template).toBe("booking.confirmation")
    expect(log!.status).toBe("sent")
  })

  it("a tenant override in TenantSetting wins over the code default", async () => {
    const { ctx } = await provision()
    await db8.orm.public.TenantSetting.create({
      tenantId: ctx.tenantId,
      key: "notify.template.booking.confirmation.en",
      value: { subject: "CUSTOM {{subject}}", html: "<p>CUSTOM</p>" },
    })
    const rendered = await renderTemplate(ctx, "booking.confirmation", "en", {})
    expect(rendered!.subject).toBe("CUSTOM {{subject}}")
  })

  it("a missing template logs a failed NotificationLog and does not send", async () => {
    const { tenant, ctx } = await provision()
    vi.mocked(sendEmail).mockClear()
    await notify(ctx, "no.such.template", "a@x.test", {})
    expect(sendEmail).not.toHaveBeenCalled()
    const log = await db8.orm.public.NotificationLog.where({
      tenantId: tenant.id,
      template: "no.such.template",
    }).first()
    expect(log).not.toBeNull()
    expect(log!.status).toBe("failed")
  })
})
