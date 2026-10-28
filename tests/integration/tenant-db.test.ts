import { afterAll, beforeEach, describe, expect, it } from "vitest"
import pg from "pg"
import { db8 } from "@/lib/db8"
import { systemContext } from "@/platform/tenancy/context"
import { tenantDb } from "@/platform/tenancy/tenant-db"
import { resetDatabase } from "@tests/helpers/db"
import { withTwoTenants } from "@tests/helpers/two-tenants"

const ctx = (tenantId: string) => systemContext(tenantId, "test")

describe("tenantDb isolation", () => {
  beforeEach(resetDatabase)
  afterAll(async () => db8.close())

  it("T1: a tenant reads only its own rows", async () => {
    const { a, b } = await withTwoTenants()
    await tenantDb(ctx(a.tenant.id), (db) => db.TenantSetting.create({ key: "display.page_size", value: 50 as never }))
    await tenantDb(ctx(b.tenant.id), (db) => db.TenantSetting.create({ key: "display.page_size", value: 10 as never }))

    const seenByA = await tenantDb(ctx(a.tenant.id), (db) => db.TenantSetting.all())
    expect(seenByA.map((row) => [row.tenantId, row.value])).toEqual([[a.tenant.id, 50]])
  })

  it("T2: a tenant cannot change or delete another tenant's row", async () => {
    const { a, b } = await withTwoTenants()
    await tenantDb(ctx(b.tenant.id), (db) => db.TenantSetting.create({ key: "k", value: 1 as never }))

    const changed = await tenantDb(ctx(a.tenant.id), (db) =>
      db.TenantSetting.where({ key: "k" }).updateAndCount({ value: 2 as never })
    )
    const deleted = await tenantDb(ctx(a.tenant.id), (db) => db.TenantSetting.where({ key: "k" }).deleteAndCount())
    expect([changed, deleted]).toEqual([0, 0])
    await expect(
      tenantDb(ctx(a.tenant.id), (db) =>
        db.TenantSetting.create({ key: "x", value: 1 as never, tenantId: b.tenant.id })
      )
    ).rejects.toMatchObject({ code: "forbidden" })
    const row = await db8.orm.public.TenantSetting.where({ tenantId: b.tenant.id, key: "k" }).first()
    expect(row?.value).toBe(1)
  })

  it("T3: RLS holds the app role to app.tenant_id, even in raw SQL", async () => {
    const { a, b } = await withTwoTenants()
    await tenantDb(ctx(a.tenant.id), (db) => db.TenantSetting.create({ key: "k", value: "A" as never }))
    await tenantDb(ctx(b.tenant.id), (db) => db.TenantSetting.create({ key: "k", value: "B" as never }))

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_TEST })
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await client.query("SET LOCAL ROLE app")
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [a.tenant.id])
      const rows = await client.query(`SELECT "tenantId" FROM "TenantSetting"`)
      expect(rows.rows.map((r) => r.tenantId)).toEqual([a.tenant.id])
      await expect(
        client.query(`INSERT INTO "TenantSetting" ("tenantId", key, value) VALUES ($1, 'x', '1')`, [b.tenant.id])
      ).rejects.toThrow(/row-level security/)
    } finally {
      await client.query("ROLLBACK").catch(() => {})
      client.release()
      await pool.end()
    }
  })

  it("records the query overhead of the scoped client", async () => {
    const { a } = await withTwoTenants()
    await tenantDb(ctx(a.tenant.id), (db) => db.TenantSetting.create({ key: "k", value: 1 as never }))
    const runs = 100
    const time = async (fn: () => PromiseLike<unknown>) => {
      await fn()
      const start = performance.now()
      for (let i = 0; i < runs; i++) await fn()
      return (performance.now() - start) / runs
    }
    const plain = await time(() => db8.orm.public.TenantSetting.where({ tenantId: a.tenant.id }).all())
    const scoped = await time(() => tenantDb(ctx(a.tenant.id), (db) => db.TenantSetting.all()))
    console.info(
      `[tenantDb overhead] plain ${plain.toFixed(2)} ms, scoped ${scoped.toFixed(2)} ms per read (${runs} runs)`
    )
    expect(scoped).toBeGreaterThan(0)
  })
})
