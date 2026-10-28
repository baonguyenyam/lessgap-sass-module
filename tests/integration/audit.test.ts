import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { audit, memberAuditContext, platformAuditContext } from "@/platform/audit"
import { resetDatabase } from "@tests/helpers/db"

// Task 1.9: the AuditLog record. Emails are all stubbed — the sign-up hook
// sends a welcome email, and none should leave a test.
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

async function auditRows() {
  return db8.orm.public.AuditLog.all()
}

describe("audit (task 1.9)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("writes a row with actor, tenant, target, data and reason", async () => {
    await audit(memberAuditContext({ tenantId: "t-tenant", user: { id: "u1" } }), {
      action: "tenancy.member.removed",
      targetType: "member",
      targetId: "m9",
      data: { userId: "u9", role: "staff" },
      reason: "left the business",
    })
    const rows = await auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenantId: "t-tenant",
      actorId: "u1",
      actorKind: "member",
      action: "tenancy.member.removed",
      targetType: "member",
      targetId: "m9",
      data: { userId: "u9", role: "staff" },
      reason: "left the business",
    })
  })

  it("records a Switch As start and stop against the ROOT user, no tenant", { timeout: 30_000 }, async () => {
    const root = await signUp()
    const target = await signUp()
    await db8.orm.public.User.where({ id: root.userId }).update({ role: "ROOT" })

    const start = await auth.api.switchAsStart({
      headers: root.session,
      body: { userId: target.userId },
      returnHeaders: true,
    })
    let rows = await auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenantId: null,
      actorId: root.userId,
      actorKind: "platform",
      action: "platform.switch_as.started",
      targetType: "user",
      targetId: target.userId,
    })

    // The switched session: every cookie the start set, back as one header.
    // `deleteSessionCookie` emits an empty session_token that must not win.
    const cookies = new Map<string, string>()
    for (const setCookie of start.headers.getSetCookie()) {
      const pair = setCookie.split(";")[0]
      if (pair.slice(pair.indexOf("=") + 1)) cookies.set(pair.slice(0, pair.indexOf("=")), pair)
    }
    const cookie = [...cookies.values()].join("; ")
    await auth.api.switchAsStop({ headers: new Headers({ cookie }) })
    rows = await auditRows()
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({
      actorId: root.userId,
      actorKind: "platform",
      action: "platform.switch_as.stopped",
      targetType: "user",
      targetId: target.userId,
    })
  })

  it("lets platform staff carry a tenant and a reason when they act on one", async () => {
    await audit(platformAuditContext("staff-1", "t-tenant"), {
      action: "platform.tenant.suspended",
      targetType: "tenant",
      targetId: "t-tenant",
      reason: "unpaid invoices",
    })
    const rows = await auditRows()
    expect(rows[0]).toMatchObject({
      tenantId: "t-tenant",
      actorKind: "platform",
      action: "platform.tenant.suspended",
      reason: "unpaid invoices",
    })
  })
})
