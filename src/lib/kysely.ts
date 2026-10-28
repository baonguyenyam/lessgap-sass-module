import { Kysely, PostgresDialect } from "kysely"
import pg from "pg"

// The schema's timestamp columns are `timestamp(3)` — naive values that are
// UTC by convention, which is also how the Prisma 8 `TimestampString` codec
// reads and writes them. node-postgres disagrees on both directions: it
// decodes a naive timestamp as local time and serializes `Date` inputs with
// local fields. Pin both to UTC so a row written through Kysely (auth)
// means the same instant when read through the Prisma 8 client.
pg.defaults.parseInputDatesAsUTC = true
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value: string) => new Date(`${value}Z`))

// Better Auth declares its JSON fields (a custom role's `permission`, a
// tenant's `metadata`) as strings and `JSON.parse`s what it reads, while the
// columns are `jsonb`, which node-postgres hands back already parsed. Read
// JSON as text on this pool only, so a tenant with a custom role does not
// break every permission check of the organization plugin (task 1.8).
const JSON_TYPES = new Set<number>([pg.types.builtins.JSON, pg.types.builtins.JSONB])
const authTypes = {
  getTypeParser: ((oid: number, format?: "text" | "binary") =>
    JSON_TYPES.has(oid)
      ? (value: string) => value
      : pg.types.getTypeParser(oid, format)) as typeof pg.types.getTypeParser,
}

function createAuthDb() {
  // Better Auth owns this connection; the adapter maps its own models onto
  // whatever tables they are configured with, so the schema type stays `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Kysely<any>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: process.env.DATABASE_URL, types: authTypes }),
    }),
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForAuthDb = globalThis as typeof globalThis & { authDb?: Kysely<any> }

export const authDb = globalForAuthDb.authDb ?? createAuthDb()

if (process.env.NODE_ENV !== "production") globalForAuthDb.authDb = authDb
