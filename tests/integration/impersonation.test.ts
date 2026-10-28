import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { resetDatabase, activateTenant } from "@tests/helpers/db"
import type { PlatformRole } from "@/platform/tenancy/context"

// Task 1.11, T8: tenant impersonation — reason required, banner session fields,
// audit rows on start and stop, 60-minute expiry. Emails are all stubbed.
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

let seq = 0
async function signUp(email = `person-${Date.now()}-${++seq}@example.test`) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: email.split("@")[0] },
    returnHeaders: true,
  })
  return { session: new Headers({ cookie: headers.get("set-cookie")!.split(";")[0] }), userId: response.user.id }
}

async function tenantWithOwner() {
  const owner = await signUp()
  const tenant = await auth.api.createOrganization({
    headers: owner.session,
    body: { name: "Impersonable", slug: `imp-${Date.now()}-${++seq}` },
  })
  await activateTenant(tenant.id)
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { owner, tenantId: tenant!.id }
}

async function staff(role: PlatformRole = "SUPPORT") {
  const s = await signUp()
  await db8.orm.public.User.where({ id: s.userId }).update({ platformRole: role })
  return s
}

function sessionCookies(start: { headers: Headers }) {
  const cookies = new Map<string, string>()
  for (const setCookie of start.headers.getSetCookie()) {
    const pair = setCookie.split(";")[0]
    if (pair.slice(pair.indexOf("=") + 1)) cookies.set(pair.slice(0, pair.indexOf("=")), pair)
  }
  return [...cookies.values()].join("; ")
}

describe("tenant impersonation (task 1.11, T8)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("opens a session as the owner with reason, expiry and audit rows", { timeout: 30_000 }, async () => {
    const { owner, tenantId } = await tenantWithOwner()
    const s = await staff()

    const before = Date.now()
    const start = await auth.api.impersonateStart({
      headers: s.session,
      body: { tenantId, reason: "support ticket 42" },
      returnHeaders: true,
    })

    const rows = await db8.orm.public.Session.where({ userId: owner.userId }).all()
    const impersonated = rows.find((r) => (r as { switchedBy?: string | null }).switchedBy === s.userId)
    expect(impersonated).toBeTruthy()
    const fields = impersonated as unknown as { impersonationTenantId: string; impersonationReason: string }
    expect(fields.impersonationTenantId).toBe(tenantId)
    expect(fields.impersonationReason).toBe("support ticket 42")
    const expiresAt = toDate(impersonated!.expiresAt).getTime()
    expect(expiresAt - before).toBeGreaterThan(59 * 60 * 1000)
    expect(expiresAt - before).toBeLessThanOrEqual(61 * 60 * 1000)

    const audits = await db8.orm.public.AuditLog.all()
    expect(audits[0]).toMatchObject({
      tenantId,
      actorId: s.userId,
      actorKind: "platform",
      action: "impersonation.started",
      targetType: "tenant",
      targetId: tenantId,
      reason: "support ticket 42",
    })

    await auth.api.switchAsStop({ headers: new Headers({ cookie: sessionCookies(start) }) })
    const stopped = (await db8.orm.public.AuditLog.all()).find((r) => r.action === "impersonation.stopped")
    expect(stopped).toMatchObject({ actorId: s.userId, tenantId, reason: "support ticket 42" })
  })

  it("refuses without a reason, for a designer, and for a suspended tenant", { timeout: 30_000 }, async () => {
    const { tenantId } = await tenantWithOwner()
    const s = await staff()
    await expect(auth.api.impersonateStart({ headers: s.session, body: { tenantId, reason: "" } })).rejects.toThrow()
    const designer = await staff("DESIGNER")
    await expect(
      auth.api.impersonateStart({ headers: designer.session, body: { tenantId, reason: "why" } })
    ).rejects.toThrow()
    await db8.orm.public.Tenant.where({ id: tenantId }).update({ status: "SUSPENDED" })
    await expect(auth.api.impersonateStart({ headers: s.session, body: { tenantId, reason: "why" } })).rejects.toThrow()
  })
})
