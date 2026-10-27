#!/usr/bin/env node
/**
 * Moves a database that Prisma 7 built onto Prisma 8, once, without touching data:
 *
 *   pnpm db:adopt                         the database in DIRECT_URL / DATABASE_URL
 *   pnpm db:adopt --drop-legacy-table     also drop Prisma 7's "_prisma_migrations"
 *
 * What it does:
 *   1. checks the database is a Prisma 7 one ("_prisma_migrations" present) and
 *      not already signed for Prisma 8;
 *   2. signs it at the baseline migration (`prisma db sign <baseline>`). Prisma
 *      verifies the live schema against the baseline contract first and refuses
 *      to sign a database that does not match, so nothing is recorded wrongly;
 *   3. applies every migration after the baseline (`prisma db migrate`), in one
 *      transaction;
 *   4. verifies the database against the contract (`prisma db verify`).
 *
 * The baseline (migrations/app/*_kit_baseline) describes exactly the schema the
 * Prisma 7 migrations of kit 2.4 produced, including
 * 20261026183000_twofactor_updatedat_default. A Prisma 7 database that is behind
 * that has to be brought up to it with the Prisma 7 migrations first.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { config } from "dotenv"
import pg from "pg"

import { toDirectUrl } from "./db-reset-guard.mjs"
import { readMigrationGraph } from "#src/lib/migration-graph.ts"

config({ path: [".env.local", ".env"], quiet: true })

const args = new Set(process.argv.slice(2))
const dropLegacy = args.has("--drop-legacy-table")

const configured = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim()
if (!configured) fail("no database URL: set DATABASE_URL (or DIRECT_URL) first")
const url = toDirectUrl(configured)
const { hostname, pathname } = new URL(url)
const database = decodeURIComponent(pathname.replace(/^\//, "")) || "postgres"

const baseline = readMigrationGraph(path.join(import.meta.dirname, "..", "migrations", "app")).find(
  (e) => e.from === null
)
if (!baseline) fail("no baseline migration in migrations/app")

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 })
try {
  await client.connect()
} catch (error) {
  fail(`could not connect to ${hostname}: ${error.message}`)
}

let legacyPresent = false
try {
  const { rows: legacy } = await client.query(`SELECT to_regclass('"_prisma_migrations"') IS NOT NULL AS present`)
  legacyPresent = legacy[0]?.present === true
  const { rows: markerTable } = await client.query(
    `SELECT to_regclass('prisma_contract.marker') IS NOT NULL AS present`
  )
  if (markerTable[0]?.present) {
    const { rows } = await client.query(`SELECT core_hash FROM prisma_contract.marker WHERE space = 'app'`)
    if (rows.length > 0) {
      console.log(`\n${database} on ${hostname} is already signed for Prisma 8. Nothing to adopt.`)
      console.log("Apply new migrations with: pnpm db:migrate\n")
      await client.end()
      process.exit(0)
    }
  }
  if (!legacyPresent) {
    fail(
      `${database} on ${hostname} has no "_prisma_migrations" table: it is not a Prisma 7 database. ` +
        "An empty database is set up with: pnpm db:migrate"
    )
  }
} finally {
  await client.end().catch(() => {})
}

console.log(`\nDatabase to adopt: ${database} on ${hostname}`)
console.log(`It will be signed at ${baseline.name}, then migrated to the current contract. No data is deleted.`)

step("1/3 Signing at the baseline")
prisma("db", "sign", baseline.name, "--no-advance-ref")
step("2/3 Applying the migrations after it")
prisma("db", "migrate")
step("3/3 Verifying against the contract")
prisma("db", "verify")

if (dropLegacy && legacyPresent) {
  const drop = new pg.Client({ connectionString: url })
  await drop.connect()
  await drop.query(`DROP TABLE IF EXISTS "_prisma_migrations"`)
  await drop.end()
  console.log(`  dropped Prisma 7's "_prisma_migrations"`)
}

console.log(`\n✔ ${database} on ${hostname} now runs on Prisma 8.`)
if (!dropLegacy && legacyPresent) {
  console.log(
    `  Prisma 7's "_prisma_migrations" table was kept; drop it with --drop-legacy-table when you no longer need it.`
  )
}

function step(title) {
  console.log(`\n▶ ${title}`)
}

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

function prisma(...rest) {
  const result = spawnSync("pnpm", ["exec", "prisma", ...rest, "--db", url, "--yes"], { stdio: "inherit" })
  if (result.error) fail(`could not start pnpm: ${result.error.message}`)
  if (result.status !== 0)
    fail(`prisma ${rest.join(" ")} failed (exit ${result.status}). Its own error is printed above.`)
}
