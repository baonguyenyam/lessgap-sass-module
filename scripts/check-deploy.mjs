#!/usr/bin/env node
/**
 * Tells you whether a database is ready for the code in this checkout.
 *
 *   pnpm check:deploy
 *   DATABASE_URL="postgresql://..." pnpm check:deploy
 *
 * The first form checks the database in your .env.local (or .env). The second
 * checks any other one, production included: a DATABASE_URL set in the shell
 * wins over the env files. Read-only, always. It never writes to the database
 * and never applies anything; it tells you what to run.
 *
 * WHY THIS EXISTS
 *
 * Builds do not run migrations, on purpose, so a deploy
 * can put new code in front of a database that is still behind it. Nothing
 * fails when that happens. Every query that does not name what is missing keeps
 * working, public pages render, and the first sign-in or checkout that touches
 * the new column fails with a database error that does not say "a migration
 * was never applied". Run this before a deploy and it says so in one line.
 *
 * It checks, in order:
 *
 *   1. that the database answers;
 *   2. that the database is at the contract this checkout was built with
 *      (Prisma 8 marker vs contract hash), and if not, how many of the
 *      migrations in migrations/app it is missing;
 *   3. the account table: which shape it is in, and, on a database upgraded
 *      from 2.0.x, the two problems the 2.1.0 migration refuses to run over.
 *      This part used to be scripts/verify-auth-migration.mjs.
 *
 * Exit code 0: ready. 1: something to fix, and the output says what. 2: the
 * check could not run, which is a different answer from "not ready".
 */

import { readFileSync } from "node:fs"
import path from "node:path"
import pg from "pg"
import { accountTableShape } from "./account-shape.mjs"
import { readMigrationGraph } from "./generate-migration-manifest.mjs"
import { pendingMigrations } from "../src/lib/migration-chain.ts"

const root = path.resolve(import.meta.dirname, "..")
const LABEL = 15
const line = (label, text = "") => console.log(`  ${label.padEnd(LABEL)}${text}`)
const more = (text) => console.log(`  ${"".padEnd(LABEL)}${text}`)

const url = process.env.DATABASE_URL
if (!url) {
  console.error('\nDATABASE_URL is not set. Put it in .env.local, or run:\n  DATABASE_URL="postgresql://..." pnpm check:deploy\n')
  process.exit(2)
}

let target
try {
  const parsed = new URL(url)
  target = { host: parsed.hostname, database: parsed.pathname.replace(/^\//, "") || "(default)" }
} catch {
  console.error("\nDATABASE_URL is not a valid connection string.\n")
  process.exit(2)
}

// Which database, before anything else. Checking the development database while
// believing it is production is the easiest way to be reassured by this tool.
console.log(`\nChecking ${target.host} / ${target.database}\n`)

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 })

// The counts, so a before-and-after comparison around a migration is possible:
// write them down before you run one that moves data. These three tables have
// been there since the first migration, so this answers whatever shape the
// account table is in, which is the point of calling it from every branch.
const reportRowCounts = async () => {
  const {
    rows: [counts],
  } = await client.query(
    `SELECT (SELECT count(*) FROM "User")::int AS users,
            (SELECT count(*) FROM "Account")::int AS accounts,
            (SELECT count(*) FROM "Session")::int AS sessions`,
  )
  line("rows", `${counts.users} users, ${counts.accounts} accounts, ${counts.sessions} sessions`)
}

try {
  await client.connect()
} catch (error) {
  line("connection", "FAILED")
  more(error.message)
  console.log("\nThe database did not answer, so nothing else was checked.\n")
  process.exit(2)
}

const problems = []

try {
  // ── 1. Connection ─────────────────────────────────────────────────────────
  await client.query("SELECT 1")
  line("connection", "ok")
  if (target.host.includes("-pooler")) {
    more("this is a pooled connection: fine for checking, but apply")
    more("migrations over the direct one (the same host without -pooler)")
  }

  // ── 2. Migrations (Prisma 8) ──────────────────────────────────────────────
  const edges = readMigrationGraph(path.join(root, "migrations", "app"))
  const contractJson = JSON.parse(readFileSync(path.join(root, "generated", "prisma8", "contract.json"), "utf8"))
  const contractHash = contractJson.storage.storageHash

  let marker = null
  try {
    const { rows } = await client.query(`SELECT core_hash FROM prisma_contract.marker WHERE space = 'app'`)
    marker = rows[0]?.core_hash ?? null
  } catch (error) {
    // No marker table: Prisma 8 never migrated or signed this database.
    if (error.code !== "42P01" && error.code !== "3F000") throw error
  }
  const { rows: legacy } = await client.query(`SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS present`)
  const builtByPrisma7 = legacy[0]?.present === true

  const pending = pendingMigrations(edges, marker, contractHash)
  if (marker === contractHash) {
    line("migrations", `at the contract (${edges.length} migration(s) in the graph)`)
  } else if (marker === null && builtByPrisma7) {
    line("migrations", "this database was built by Prisma 7 and is not signed for Prisma 8:")
    more("-> pnpm db:adopt   (signs it at the baseline, then applies what follows)")
    problems.push("the database has not been adopted by Prisma 8")
  } else if (pending === null) {
    line("migrations", "the database is on no path to this checkout's contract:")
    more("it was changed outside the migration system, or built from another")
    more("branch. Inspect with: pnpm prisma db verify --db <url>")
    problems.push("the database schema is not on the migration graph")
  } else {
    line("migrations", `${pending.length} not applied:`)
    for (const edge of pending) more(`  ${edge.name}`)
    more("-> pnpm db:migrate")
    problems.push(`${pending.length} migration(s) not applied`)
  }

  // ── 3. The account table ──────────────────────────────────────────────────
  //
  // Asked of the database rather than of the Prisma schema, because the two
  // disagreeing is exactly the situation worth catching.
  //
  // The shape comes first, and it is the whole reason this section is arranged
  // this way. Before 2.0 the table is still Auth.js's, with no providerId, so
  // the two checks below are asking about columns that do not exist: they used
  // to end the run with "the check stopped on an unexpected error", on the
  // databases that most needed the answer.
  let accountProblems = 0
  try {
    const { rows: columns } = await client.query(
      `SELECT column_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'Account'`,
    )
    const shape = accountTableShape(columns.map((c) => c.column_name))

    if (shape === "absent") {
      // A new database, covered by the migrations above.
      line("account table", "not created yet")
    } else if (shape === "before-2.0") {
      line("account table", "still the shape it had before 2.0:")
      more("provider / providerAccountId, and no providerId. The 2.0")
      more("migration converts it, and moves every password while it")
      more("does. Nothing else about this")
      more("table can be checked until then")
      // The Prisma 8 baseline starts after 2.0: such a database cannot be
      // adopted until it is upgraded with the 2.x kit first.
      problems.push("the account table is still the shape it had before 2.0")
      await reportRowCounts()
    } else {
      const issuer = columns.find((c) => c.column_name === "issuer")
      if (issuer && issuer.is_nullable === "NO" && issuer.column_default === null) {
        line("account table", 'the "issuer" column is still required, and nothing writes it:')
        more("every sign-up and every account link fails until the 2.1.0")
        more("migration is applied")
        accountProblems++
      }

      const { rows: dupes } = await client.query(
        `SELECT "providerId", "accountId", count(*)::int AS rows FROM "Account"
          GROUP BY "providerId", "accountId" HAVING count(*) > 1
          ORDER BY rows DESC LIMIT 20`,
      )
      if (dupes.length > 0) {
        line(accountProblems ? "" : "account table", `${dupes.length} duplicate (providerId, accountId) pair(s):`)
        for (const d of dupes) more(`  ${d.rows} rows for ${d.providerId} / ${d.accountId}`)
        more("decide which row survives and delete the others: the 2.1.0")
        more("migration refuses to run over them")
        accountProblems++
      }

      if (accountProblems === 0) line("account table", "ok")
      else problems.push("the account table needs attention")

      await reportRowCounts()
    }
  } catch (error) {
    // A shape no version of this kit has produced. Say so and keep the answer
    // above, rather than turning a useful run into "could not check".
    if (error.code !== "42P01" && error.code !== "42703") throw error
    line("account table", "could not be read on this database:")
    more(error.message)
    more("apply the migrations above (pnpm db:migrate), then run this again")
  }
} catch (error) {
  console.log(`\nThe check stopped on an unexpected error: ${error.message}\n`)
  await client.end()
  process.exit(2)
}

await client.end()

if (problems.length === 0) {
  console.log("\nReady: this database can run the code in this checkout.\n")
  process.exit(0)
}

console.log(`\nNot ready: ${problems.join("; ")}. Fix these before you deploy.\n`)
process.exit(1)
