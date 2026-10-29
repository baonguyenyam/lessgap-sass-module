import postgres from "@prisma/orm-postgres/runtime"
import { contractFromJson } from "@prisma/orm-postgres/static"
import pgvectorRuntime from "@prisma/orm-extension-pgvector/runtime"

/** Every `postgres()` client on this contract lists the same extension
 * runtime descriptors — the contract requires `pgvector`; a client without
 * it throws RUNTIME.MISSING_EXTENSION_PACK at first query. */
export const dbExtensions = [pgvectorRuntime as never]
import type { Contract, FieldOutputTypes } from "@/generated/prisma8/contract.d"
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" }

/**
 * The Prisma ORM 8 client. `db.orm.public.<Model>` is the typed ORM surface;
 * `db.sql` is the query builder and `db.raw` runs raw SQL. `contractFromJson`
 * turns the emitted contract into the typed value the client takes.
 */
export const contract = contractFromJson<Contract>(contractJson)

function createDb() {
  return postgres({ contract, url: process.env.DATABASE_URL!, extensions: dbExtensions })
}

// In development the client survives hot reloads on `globalThis`, so the dev
// server does not open a new pool on every edit. It is kept per contract hash:
// a client built before a schema change has no accessor for a new model, and
// reusing it fails with "Cannot read properties of undefined" until a restart.
const contractHash = (contractJson as { storage: { storageHash: string } }).storage.storageHash
const globalForDb = globalThis as typeof globalThis & { db8?: ReturnType<typeof createDb>; db8Hash?: string }

export const db8 = globalForDb.db8 && globalForDb.db8Hash === contractHash ? globalForDb.db8 : createDb()

if (process.env.NODE_ENV !== "production") {
  globalForDb.db8 = db8
  globalForDb.db8Hash = contractHash
}

/**
 * The scalar row of a model as `db8` returns it: `Row<"User">`. Timestamps are
 * `TimestampString` values; `toDate` in `@/lib/timestamps` reads them.
 */
export type Row<M extends keyof FieldOutputTypes["public"]> = FieldOutputTypes["public"][M]

/**
 * Names a unique key for `upsert`'s `conflictOn` when that key is a unique
 * index rather than a unique constraint, which is how the Prisma 7 baseline
 * created every unique key here (`@@index(..., unique: true)` in the
 * contract). Postgres resolves `ON CONFLICT (column)` against either; Prisma 8
 * types `conflictOn` from constraints only, so without this only the primary
 * key compiles. The key must match a unique index of the table.
 */
export const uniqueIndexKey = <K extends Record<string, string>>(key: K) => key as never
