import { config } from "dotenv"
import { execFileSync } from "node:child_process"

config({ path: [".env.local", ".env"], quiet: true })

function requiredTestDatabaseUrl(): string {
  const value = process.env["DATABASE_URL_TEST"]
  if (!value) throw new Error("DATABASE_URL_TEST is required to run integration tests.")
  return value
}

function databaseIdentity(value: string) {
  const url = new URL(value)
  return `${url.protocol}//${url.hostname}:${url.port || "5432"}${url.pathname}`
}

export default async function migrateTestDatabase() {
  const databaseUrl = process.env["DATABASE_URL"]
  const testDatabaseUrl = requiredTestDatabaseUrl()

  if (databaseUrl && databaseIdentity(databaseUrl) === databaseIdentity(testDatabaseUrl)) {
    throw new Error("DATABASE_URL_TEST must point to a different database than DATABASE_URL.")
  }

  execFileSync("pnpm", ["exec", "prisma", "db", "migrate", "--db", testDatabaseUrl], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  })

  // The app and platform roles (phase 1, task 1.1), as `pnpm db:roles` creates them.
  const { applyRoles } = await import("#scripts/db-roles.mjs")
  await applyRoles(testDatabaseUrl)
}
