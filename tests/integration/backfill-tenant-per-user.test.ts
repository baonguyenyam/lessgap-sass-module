import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { auth } from "@/auth"
import { db8 } from "@/lib/db8"
import { resetDatabase } from "@tests/helpers/db"
import { runTenantPerUserBackfill } from "@/platform/backfills/tenant-per-user"

/**
 * M4 (task 1.12): the tenant-per-user backfill is idempotent — a second run
 * creates nothing, and a rerun after a crash only fills what is missing.
 * Emails are all stubbed.
 */
vi.mock("@/lib/email", async (importOriginal) =>
  Object.fromEntries(Object.keys(await importOriginal<object>()).map((name) => [name, vi.fn(async () => true)]))
)

let seq = 0
async function signUp() {
  const email = `person-${Date.now()}-${++seq}@example.test`
  const { response } = await auth.api.signUpEmail({
    body: { email, password: "correct horse battery staple", name: email.split("@")[0] },
    returnHeaders: true,
  })
  return response.user.id
}

const log = () => {}

describe("backfill tenant-per-user (M4)", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it(
    "creates a tenant for every user with no membership, then nothing on a second run",
    {
      timeout: 60_000,
    },
    async () => {
      const a = await signUp()
      const b = await signUp()

      const first = await runTenantPerUserBackfill({ apply: true, log })
      expect(first).toEqual({ created: 2, skipped: 0 })
      for (const userId of [a, b]) {
        const member = await db8.orm.public.Member.where({ userId }).first()
        expect(member?.role).toBe("owner")
        const tenant = await db8.orm.public.Tenant.where({ id: member!.organizationId }).first()
        expect(tenant?.status).toBe("ACTIVE")
      }

      const second = await runTenantPerUserBackfill({ apply: true, log })
      expect(second).toEqual({ created: 0, skipped: 2 })
      expect(await db8.orm.public.Tenant.aggregate((x) => ({ n: x.count() }))).toEqual({ n: 2 })
    }
  )

  it(
    "dry-run reports but writes nothing; a user who already owns a tenant is skipped",
    {
      timeout: 60_000,
    },
    async () => {
      const withTenant = await signUp()
      const tenant = await auth.api.createOrganization({
        body: { name: "Already", slug: `already-${Date.now()}`, userId: withTenant },
      })
      const without = await signUp()

      const dry = await runTenantPerUserBackfill({ apply: false, log })
      expect(dry.created).toBe(1)
      expect(await db8.orm.public.Tenant.aggregate((x) => ({ n: x.count() }))).toEqual({ n: 1 })

      const applied = await runTenantPerUserBackfill({ apply: true, log })
      expect(applied).toEqual({ created: 1, skipped: 1 })
      expect(await db8.orm.public.Member.where({ userId: without }).first()).toMatchObject({
        organizationId: expect.any(String),
      })
      expect(tenant.id).not.toBe((await db8.orm.public.Member.where({ userId: without }).first())!.organizationId)
    }
  )
})
