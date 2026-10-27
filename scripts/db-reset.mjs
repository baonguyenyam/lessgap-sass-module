#!/usr/bin/env node
/**
 * Rebuilds the development database from nothing:
 *
 *   pnpm db:reset          drop everything, recreate the schema, run the system seed
 *   pnpm db:reset:demo     the same, then the demo seed
 *
 * Prisma ORM 8 has no `migrate reset`, so this does the three steps itself:
 *   1. drop the `public` schema and any Prisma bookkeeping schema, then recreate `public`;
 *   2. build the schema by applying every migration in migrations/app
 *      (`prisma db migrate`), which also writes the Prisma 8 marker;
 *   3. run prisma/seed.ts, and prisma/seed-demo.ts with --demo.
 *
 * It refuses production and any remote host that is not explicitly allowed
 * (see scripts/db-reset-guard.mjs). It never runs against DATABASE_URL_TEST
 * by accident either: the URL used is printed (without credentials) before
 * anything is dropped.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { config } from "dotenv"
import pg from "pg"

import { checkResetTarget, toDirectUrl } from "./db-reset-guard.mjs"

config({ path: [".env.local", ".env"], quiet: true })

const args = new Set(process.argv.slice(2))
const withDemo = args.has("--demo")

// Schema changes need a direct connection. DIRECT_URL wins when set; a Neon
// `-pooler` host (in either variable) is switched to its direct host, because
// PgBouncer in transaction mode breaks what Prisma does while building a schema.
const configured = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim()
const url = configured ? toDirectUrl(configured) : configured

const target = checkResetTarget({ url, env: process.env })
if (!target.ok) {
  console.error(`✖ ${target.reason}`)
  process.exit(1)
}

// No typed confirmation: the guard above already limits this to local
// databases and the hosts listed in DB_RESET_ALLOW_HOSTS, never production.
// The target is still printed first, so the log says what was wiped.
console.log(`Resetting ${target.database} on ${target.host}: everything in it is deleted.`)

// 1. Drop.
step("1/3 Dropping the schema")
const client = new pg.Client({ connectionString: url })
try {
  await client.connect()
} catch (error) {
  fail(
    "connecting to the database",
    error,
    "check the URL, the password and that the database is reachable from this machine"
  )
}
try {
  const { rows } = await client.query(
    `SELECT nspname FROM pg_namespace
     WHERE nspname = 'public' OR nspname ILIKE 'prisma%' OR nspname ILIKE '\\_prisma%'`
  )
  for (const { nspname } of rows) {
    await client.query(`DROP SCHEMA IF EXISTS "${nspname.replaceAll('"', '""')}" CASCADE`)
    console.log(`  dropped schema ${nspname}`)
  }
  await client.query(`CREATE SCHEMA public`)
  await client.query(`GRANT ALL ON SCHEMA public TO CURRENT_USER`)
  await client.query(`GRANT USAGE ON SCHEMA public TO PUBLIC`)
  console.log("  recreated schema public")
} catch (error) {
  fail("dropping the schema", error, "the database user must own the schema (on Neon: the role that owns the database)")
} finally {
  await client.end().catch(() => {})
}

// 2. Rebuild.
step("2/3 Building the schema")
const prisma = (...rest) => run("pnpm", ["exec", "prisma", ...rest, "--db", url, "--yes"])
if (!existsSync("migrations/app") || readdirSync("migrations/app").every((name) => name.startsWith("."))) {
  fail(
    "rebuilding the schema",
    new Error("no migrations in migrations/app"),
    "plan the baseline first: pnpm db:plan --name kit_baseline"
  )
}
console.log("Applying every migration (prisma db migrate)…")
prisma("db", "migrate")

// 3. Seed.
step("3/3 Seeding")
console.log("Seeding system data…")
run("pnpm", ["exec", "tsx", "prisma/seed.ts"])
if (withDemo) {
  console.log("Seeding demo data…")
  run("pnpm", ["exec", "tsx", "prisma/seed-demo.ts"])
}

console.log(`✔ ${target.database} on ${target.host} rebuilt${withDemo ? " with demo data" : ""}.`)

function step(title) {
  console.log(`\n▶ ${title}`)
}

function fail(what, error, hint) {
  console.error(`\n✖ Failed while ${what}: ${error?.code ? `[${error.code}] ` : ""}${error?.message ?? error}`)
  if (hint) console.error(`  Hint: ${hint}`)
  process.exit(1)
}

function run(command, commandArgs) {
  // The child gets the direct URL too, so seeds and Prisma talk to the same
  // database the schema was just rebuilt in.
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url }
  const result = spawnSync(command, commandArgs, { stdio: "inherit", env })
  if (result.error) fail(`starting ${command}`, result.error, `is ${command} on your PATH?`)
  if (result.status !== 0) {
    const shown = commandArgs.map((a) => (a === url ? "<url>" : a)).join(" ")
    console.error(`\n✖ ${command} ${shown} failed (exit ${result.status}). Its own error is printed above.`)
    process.exit(result.status ?? 1)
  }
}
