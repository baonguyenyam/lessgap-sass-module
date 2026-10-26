import postgres from "@prisma/orm-postgres/runtime"
import { contractFromJson } from "@prisma/orm-postgres/static"
import type { Contract } from "@/generated/prisma8/contract.d"
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" }

/**
 * The Prisma ORM 8 client. `db.orm.public.<Model>` is the typed ORM surface;
 * `db.sql` is the query builder and `db.raw` runs raw SQL. `contractFromJson`
 * turns the emitted contract into the typed value the client takes.
 */
export const contract = contractFromJson<Contract>(contractJson)

function createDb() {
  return postgres({ contract, url: process.env.DATABASE_URL! })
}

const globalForDb = globalThis as typeof globalThis & { db8?: ReturnType<typeof createDb> }

export const db8 = globalForDb.db8 ?? createDb()

if (process.env.NODE_ENV !== "production") globalForDb.db8 = db8
