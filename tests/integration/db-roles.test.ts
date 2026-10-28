import { afterAll, beforeAll, describe, expect, it } from "vitest"
import pg from "pg"
import { newId } from "@/lib/ids"

// Phase 1, task 1.1: the app role is held by RLS, the platform role is not,
// and the app role can do the application's work on its tables.
const owner = new pg.Pool({ connectionString: process.env.DATABASE_URL_TEST })

async function asRole<T>(role: "app" | "platform", tenantId: string | null, run: (c: pg.PoolClient) => Promise<T>) {
  const client = await owner.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL ROLE ${role}`)
    if (tenantId) await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId])
    return await run(client)
  } finally {
    await client.query("ROLLBACK").catch(() => {})
    client.release()
  }
}

describe("database roles", () => {
  beforeAll(async () => {
    await owner.query(`DROP TABLE IF EXISTS rls_probe`)
    await owner.query(`CREATE TABLE rls_probe ("tenantId" text NOT NULL, note text NOT NULL)`)
    await owner.query(`ALTER TABLE rls_probe ENABLE ROW LEVEL SECURITY`)
    await owner.query(`ALTER TABLE rls_probe FORCE ROW LEVEL SECURITY`)
    await owner.query(`CREATE POLICY rls_probe_tenant ON rls_probe
      USING ("tenantId" = current_setting('app.tenant_id', true))
      WITH CHECK ("tenantId" = current_setting('app.tenant_id', true))`)
    await owner.query(`GRANT SELECT, INSERT ON rls_probe TO app, platform`)
    await owner.query(`INSERT INTO rls_probe VALUES ('a', 'of A'), ('b', 'of B')`)
  })

  afterAll(async () => {
    await owner.query(`DROP TABLE IF EXISTS rls_probe`)
    await owner.end()
  })

  it("holds the app role to the tenant it set", async () => {
    const rows = await asRole("app", "a", (c) => c.query("SELECT note FROM rls_probe"))
    expect(rows.rows.map((r) => r.note)).toEqual(["of A"])
    const none = await asRole("app", null, (c) => c.query("SELECT note FROM rls_probe"))
    expect(none.rows).toEqual([])
  })

  it("does not let the app role switch RLS off or write into another tenant", async () => {
    await expect(
      asRole("app", "a", (c) => c.query("SET LOCAL row_security = off; SELECT note FROM rls_probe"))
    ).rejects.toThrow(/row-level security/)
    await expect(asRole("app", "a", (c) => c.query(`INSERT INTO rls_probe VALUES ('b', 'sneaky')`))).rejects.toThrow(
      /row-level security/
    )
  })

  it("lets the platform role read across tenants", async () => {
    const rows = await asRole("platform", null, (c) => c.query("SELECT note FROM rls_probe ORDER BY note"))
    expect(rows.rows.map((r) => r.note)).toEqual(["of A", "of B"])
  })

  it("lets the app role read and write the application's tables", async () => {
    const id = newId()
    const found = await asRole("app", null, async (c) => {
      await c.query(`INSERT INTO "User" (id, name, email, "updatedAt") VALUES ($1, 'App Role', $2, now())`, [
        id,
        `${id}@example.test`,
      ])
      return c.query(`SELECT name FROM "User" WHERE id = $1`, [id])
    })
    expect(found.rows[0]?.name).toBe("App Role")
  })
})
