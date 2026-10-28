import postgres from "@prisma/orm-postgres/runtime"
import { contract } from "@/lib/db8"

/**
 * The platform client (spec/12-migrations-and-data.md, "Database roles"): the
 * `platform` role, which bypasses RLS, for reads across tenants by the console
 * and jobs. Only code under `src/platform/` imports it (`.agents/rules/database.md`);
 * module and dashboard code goes through `tenantDb` (task 1.5).
 *
 * `DATABASE_URL_PLATFORM` until it is set falls back to `DATABASE_URL`, which
 * keeps a single-role database working.
 */
function createPlatformDb() {
  return postgres({ contract, url: process.env.DATABASE_URL_PLATFORM || process.env.DATABASE_URL! })
}

const globalForPlatformDb = globalThis as typeof globalThis & { platformDb?: ReturnType<typeof createPlatformDb> }

export const platformDb = globalForPlatformDb.platformDb ?? createPlatformDb()

if (process.env.NODE_ENV !== "production") globalForPlatformDb.platformDb = platformDb
