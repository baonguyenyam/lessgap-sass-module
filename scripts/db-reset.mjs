#!/usr/bin/env node
/**
 * Rebuilds the development database from nothing:
 *
 *   pnpm db:reset          drop everything, recreate the schema, run the system seed
 *   pnpm db:reset:demo     the same, then the demo seed
 *   pnpm db:reset --yes    skip the typed confirmation (scripts, CI on a throwaway database)
 *
 * Prisma ORM 8 has no `migrate reset`, so this does the three steps itself:
 *   1. drop the `public` schema and any Prisma bookkeeping schema, then recreate `public`;
 *   2. build the schema: `prisma db migrate` when on-disk migrations exist,
 *      otherwise `prisma db init` (bootstrap from the contract and sign it);
 *   3. run prisma/seed.ts, and prisma/seed-demo.ts with --demo.
 *
 * It refuses production and any remote host that is not explicitly allowed
 * (see scripts/db-reset-guard.mjs). It never runs against DATABASE_URL_TEST
 * by accident either: the URL used is printed (without credentials) before
 * anything is dropped.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { createInterface } from "node:readline/promises"
import { config } from "dotenv"
import pg from "pg"

import { checkResetTarget } from "./db-reset-guard.mjs"

config({ path: [".env.local", ".env"], quiet: true })

const args = new Set(process.argv.slice(2))
const withDemo = args.has("--demo")
const skipConfirm = args.has("--yes") || args.has("-y")

// DDL goes through the direct connection when there is one: a pooler in
// transaction mode handles these statements, but a direct connection is what
// schema changes are meant to use.
const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim()

const target = checkResetTarget({ url, env: process.env })
if (!target.ok) {
  console.error(`✖ ${target.reason}`)
  process.exit(1)
}

console.log(`Database to reset: ${target.database} on ${target.host}`)
console.log("Everything in it will be deleted.")

if (!skipConfirm) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Type the database name (${target.database}) to continue: `)
  rl.close()
  if (answer.trim() !== target.database) {
    console.error("✖ Name did not match. Nothing was changed.")
    process.exit(1)
  }
}

// 1. Drop.
const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  const { rows } = await client.query(
    `SELECT nspname FROM pg_namespace
     WHERE nspname = 'public' OR nspname ILIKE 'prisma%' OR nspname ILIKE '\\_prisma%'`,
  )
  for (const { nspname } of rows) {
    await client.query(`DROP SCHEMA IF EXISTS "${nspname.replaceAll('"', '""')}" CASCADE`)
    console.log(`  dropped schema ${nspname}`)
  }
  await client.query(`CREATE SCHEMA public`)
  await client.query(`GRANT ALL ON SCHEMA public TO CURRENT_USER`)
  await client.query(`GRANT USAGE ON SCHEMA public TO PUBLIC`)
  console.log("  recreated schema public")
} finally {
  await client.end()
}

// 2. Rebuild.
const prisma = (...rest) => run("pnpm", ["exec", "prisma", ...rest, "--db", url, "--yes"])
const migrationsDir = "migrations/app"
const hasMigrations = existsSync(migrationsDir) && readdirSync(migrationsDir).some((name) => !name.startsWith("."))
if (hasMigrations) {
  console.log("Applying migrations (prisma db migrate)…")
  prisma("db", "migrate")
} else {
  console.log("No migrations yet: bootstrapping from the contract (prisma db init)…")
  prisma("db", "init")
}

// 3. Seed.
console.log("Seeding system data…")
run("pnpm", ["exec", "tsx", "prisma/seed.ts"])
if (withDemo) {
  console.log("Seeding demo data…")
  run("pnpm", ["exec", "tsx", "prisma/seed-demo.ts"])
}

console.log(`✔ ${target.database} on ${target.host} rebuilt${withDemo ? " with demo data" : ""}.`)

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit", env: process.env })
  if (result.status !== 0) {
    console.error(`✖ ${command} ${commandArgs.filter((a) => a !== url).join(" ")} failed (exit ${result.status}).`)
    process.exit(result.status ?? 1)
  }
}
