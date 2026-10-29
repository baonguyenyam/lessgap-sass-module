import { afterAll, describe, expect, it } from "vitest"
import { sql } from "kysely"
import { authDb } from "@/lib/kysely"
import { MODEL_CLASSIFICATION } from "@/platform/tenancy/models"

/** RLS coverage (task 8.1, roadmap P8): every `tenant-owned` table must
 * have RLS enabled and at least one policy — a new tenant table without
 * `@@rls` fails this suite, not a customer. `identity` tables belong to
 * Better Auth's own pool and are out of scope. */
const TENANT_TABLES = Object.entries(MODEL_CLASSIFICATION)
  .filter(([, c]) => c.kind === "tenant-owned")
  .map(([name]) => name)

describe("RLS coverage (8.1)", () => {
  afterAll(async () => authDb.destroy())

  it("every tenant-owned table has at least one RLS policy", async () => {
    expect(TENANT_TABLES.length).toBeGreaterThan(40)
    const rows = await sql<{ tablename: string; count: bigint }>`
      SELECT tablename, count(*) AS count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
    `.execute(authDb)
    const policies = new Map(rows.rows.map((r) => [r.tablename, Number(r.count)]))
    const missing = TENANT_TABLES.filter((t) => !policies.has(t))
    expect(missing).toEqual([])
  })

  it("RLS is enabled (not just policies present) on every tenant-owned table", async () => {
    const rows = await sql<{ relname: string; relrowsecurity: boolean }>`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
    `.execute(authDb)
    const enabled = new Map(rows.rows.map((r) => [r.relname, r.relrowsecurity]))
    const disabled = TENANT_TABLES.filter((t) => enabled.get(t) !== true)
    expect(disabled).toEqual([])
  })
})
