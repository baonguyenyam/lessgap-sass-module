import { describe, expect, it, vi } from "vitest"
import contract from "@/generated/prisma8/contract.json" with { type: "json" }

/**
 * Better Auth writes its tables through Kysely and checks, once at startup,
 * that every column it writes exists. A plugin that adds one (the organization
 * plugin's `Session.activeOrganizationId`, a new `additionalFields` entry)
 * without the contract declaring it takes every page down with "Database
 * schema mismatch", and nothing before startup notices. This compares the two
 * here instead, with no database: the auth instance gets a Kysely whose driver
 * never connects.
 */
vi.mock("@/lib/kysely", async () => {
  const { Kysely, DummyDriver, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } = await import("kysely")
  return {
    authDb: new Kysely({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db) => new PostgresIntrospector(db),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      },
    }),
  }
})

type ContractTables = Record<string, { columns: Record<string, unknown> }>
const tables = (contract as unknown as { storage: { namespaces: { public: { entries: { table: ContractTables } } } } })
  .storage.namespaces.public.entries.table

describe("the Better Auth schema", () => {
  it("is declared in full in prisma/contract.prisma", async () => {
    const { auth } = await import("@/auth")
    const { getSchema } = await import("better-auth/db")
    const expected = getSchema(auth.options as never) as Record<
      string,
      { fields: Record<string, { fieldName?: string }> }
    >

    const missing: string[] = []
    for (const [table, { fields }] of Object.entries(expected)) {
      const columns = tables[table]?.columns
      if (!columns) {
        missing.push(`${table} (table)`)
        continue
      }
      for (const [key, field] of Object.entries(fields)) {
        const column = field.fieldName ?? key
        if (!(column in columns)) missing.push(`${table}.${column}`)
      }
    }
    expect(missing, "add these to prisma/contract.prisma, then pnpm db:emit and pnpm db:plan").toEqual([])
  })
})
