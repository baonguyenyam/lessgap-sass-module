import { describe, it, expect } from "vitest"
import path from "node:path"
import { MIGRATIONS } from "@/generated/migrations"
import contractJson from "../../generated/prisma8/contract.json" with { type: "json" }
import { readMigrationGraph } from "../../scripts/generate-migration-manifest.mjs"

/**
 * The manifest compiled into the build must describe exactly the migrations in
 * migrations/app.
 *
 * The failure this prevents is quiet and points the wrong way. Plan a migration,
 * forget to regenerate, and /api/health walks an older graph: it cannot count
 * what the database is missing, or worse, counts against a graph that is not
 * the one being deployed.
 */
describe("the migration manifest", () => {
  it("lists every migration in migrations/app, in order, with its hashes", () => {
    const onDisk = readMigrationGraph(path.join(process.cwd(), "migrations", "app"))
    expect(
      [...MIGRATIONS],
      "src/generated/migrations.ts is out of date: run node scripts/generate-migration-manifest.mjs",
    ).toEqual(onDisk)
  })

  // Edit the contract, forget `pnpm db:plan`, and the code expects a schema no
  // migration produces: every database would report "unknown" and deploys
  // would have nothing to apply.
  it("reaches the current contract", () => {
    expect(
      MIGRATIONS.map((edge) => edge.to),
      "the contract changed but no migration reaches it: run pnpm db:plan --name <owner>_<change>",
    ).toContain(contractJson.storage.storageHash)
  })

  it("starts from a baseline", () => {
    expect(MIGRATIONS[0]?.from).toBeNull()
  })
})
