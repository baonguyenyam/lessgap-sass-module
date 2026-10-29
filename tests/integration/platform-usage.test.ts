import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { resetDatabase } from "@tests/helpers/db"

async function provision() {
  const { user } = await auth.api.signUpEmail({
    body: {
      email: `use-${Date.now()}-${Math.random()}@example.test`,
      password: "correct horse battery staple",
      name: "U",
    },
  })
  const tenant = await auth.api.createOrganization({
    body: { name: "UseCo", slug: `use-${Date.now()}`, userId: user.id },
  })
  await db8.orm.public.Tenant.where({ id: tenant.id }).update({ status: "ACTIVE" })
  return { tenant }
}

/** /platform/usage reads (8.5): the page's queries return real rows —
 * UsageCounter per tenant, Job by status/kind, ErrorReport counts. */
describe("platform usage reads (8.5)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("usage counters, jobs and error reports read back for the page", async () => {
    const { tenant } = await provision()
    await db8.orm.public.UsageCounter.create({
      tenantId: tenant.id,
      limitKey: "chatbot.messages.monthly",
      periodStart: nowTs(),
      used: 7,
    })
    await db8.orm.public.Job.create({
      kind: "platform.tenant.snapshot",
      payload: { tenantId: tenant.id },
      status: "QUEUED",
      tenantId: tenant.id,
    })
    await db8.orm.public.ErrorReport.create({
      digest: "d1",
      source: "api",
      name: "AppError",
      message: "boom",
      count: 3,
    })
    const counters = await db8.orm.public.UsageCounter.include("tenant").all()
    const jobs = await db8.orm.public.Job.where({ status: "QUEUED" }).all()
    const errors = await db8.orm.public.ErrorReport.all()
    expect(counters[0]!.used).toBe(7)
    expect(counters[0]!.tenant.name).toBe("UseCo")
    expect(jobs).toHaveLength(1)
    expect(errors.reduce((a, e) => a + e.count, 0)).toBe(3)
  })
})
