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

function createAuthDb() {
  // Better Auth owns this connection; the adapter maps its own models onto
  // whatever tables they are configured with, so the schema type stays `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Kysely<any>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }) }),
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForAuthDb = globalThis as typeof globalThis & { authDb?: Kysely<any> }

export const authDb = globalForAuthDb.authDb ?? createAuthDb()

if (process.env.NODE_ENV !== "production") globalForAuthDb.authDb = authDb
