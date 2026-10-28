/**
 * Creates the database group roles and their grants (spec/12-migrations-and-data.md,
 * "Database roles"; phase 1, task 1.1):
 *
 *   app       the running application. RLS is enforced on it (no BYPASSRLS).
 *   platform  src/platform/db.ts: cross-tenant reads for the console and jobs. BYPASSRLS.
 *
 * Both are NOLOGIN groups. Logins and passwords never live in the repository:
 * create a login role in the provider's console and grant it a group
 * (`GRANT app TO app_login;`), then point DATABASE_URL / DATABASE_URL_PLATFORM
 * at those logins. The grants include default privileges, so tables created
 * by later migrations are covered without running this again.
 *
 * Run as the owner, once per database; running it again changes nothing:
 *   pnpm db:roles                 the database in DATABASE_URL_MIGRATE / DIRECT_URL / DATABASE_URL
 *
 * Not a migration: Prisma 8 refuses a migration that leaves the contract
 * unchanged unless it carries a data invariant, and such an edge only runs when
 * a ref asks for it, so it would never reach `pnpm db:migrate`.
 */
import pg from "pg"
import { ownerUrl } from "#src/lib/database-url.ts"

export const ROLE_STATEMENTS = [
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    CREATE ROLE app NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform') THEN
    BEGIN
      CREATE ROLE platform NOLOGIN BYPASSRLS;
    EXCEPTION WHEN insufficient_privilege THEN
      CREATE ROLE platform NOLOGIN;
      RAISE NOTICE 'role platform created without BYPASSRLS: grant it once with a superuser';
    END;
  END IF;
END
$$`,
  "GRANT USAGE ON SCHEMA public TO app, platform",
  "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app, platform",
  "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO app, platform",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app, platform",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO app, platform",
  // The runtime reads the contract marker at start.
  `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'prisma_contract') THEN
    GRANT USAGE ON SCHEMA prisma_contract TO app, platform;
    GRANT SELECT ON ALL TABLES IN SCHEMA prisma_contract TO app, platform;
  END IF;
END
$$`,
]

/** Applies every statement on one connection, in one transaction. */
export async function applyRoles(connectionString) {
  const client = new pg.Client({ connectionString })
  client.on("notice", (notice) => console.warn(`notice: ${notice.message}`))
  await client.connect()
  try {
    await client.query("BEGIN")
    for (const statement of ROLE_STATEMENTS) await client.query(statement)
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

if (import.meta.main) {
  const url = ownerUrl(process.env)
  if (!url) {
    console.error("no database URL: set DATABASE_URL_MIGRATE, DIRECT_URL or DATABASE_URL")
    process.exit(1)
  }
  await applyRoles(url)
  console.log("Database roles app and platform are in place.")
}
