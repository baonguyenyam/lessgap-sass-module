import path from "node:path"
import { createPostgresControlClient } from "@prisma/orm-postgres/control"
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" }
import { MIGRATIONS } from "@/generated/migrations"
import { toDirectUrl } from "@/lib/database-url"
import { readMarkerFromDatabase } from "@/lib/schema-status"
import { storageConfigured } from "@/platform/storage/r2"
import { createBackup, directClient } from "@/platform/database/backup"
import { migrationStatus, type MigrationStatus } from "@/platform/database/migration-status"

/**
 * Applying migrations from the admin panel (spec/adr/0023). The same runner as
 * `pnpm db:migrate` (Prisma 8's control client), on the direct host, with the
 * migration packages shipped next to the function.
 */

const target = (contractJson as { storage: { storageHash: string } }).storage.storageHash

/** Any constant, as long as nothing else in the app takes the same advisory lock. */
const LOCK_KEY = 20_231_023

export async function getMigrationStatus(): Promise<MigrationStatus> {
  return migrationStatus(MIGRATIONS, await readMarkerFromDatabase(), target)
}

export type ApplyResult =
  | { ok: true; applied: string[]; backupKey: string | null }
  | { ok: false; reason: "locked" | "unknown-state" | "no-storage" | "backup-failed" | "migrate-failed"; code?: string }

/**
 * Brings the database to the build's contract. In order: take the lock (a
 * second run is refused, not queued), check the state, back up (required in
 * production), migrate, release. Every refusal happens before anything is
 * written.
 */
export async function applyMigrations(startedBy: string): Promise<ApplyResult> {
  const lock = directClient()
  await lock.connect()
  try {
    const taken = await lock.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [LOCK_KEY])
    if (!taken.rows[0]?.locked) return { ok: false, reason: "locked" }

    try {
      const status = await getMigrationStatus()
      if (status.state === "current") return { ok: true, applied: [], backupKey: null }
      if (status.state === "unknown") return { ok: false, reason: "unknown-state" }

      let backupKey: string | null = null
      if (storageConfigured()) {
        try {
          backupKey = (await createBackup(startedBy)).key
        } catch (error) {
          console.error("[database] backup before migrate failed:", error)
          return { ok: false, reason: "backup-failed" }
        }
      } else if (process.env.NODE_ENV === "production") {
        return { ok: false, reason: "no-storage" }
      }

      const url = toDirectUrl(process.env.DIRECT_URL || process.env.DATABASE_URL || "")
      const client = createPostgresControlClient({ connection: url })
      const result = await client
        .migrate({
          invocation: { cwd: process.cwd(), configPath: undefined, dbGiven: false },
          contract: contractJson,
          migrationsDir: path.join(process.cwd(), "migrations"),
        })
        .finally(() => client.close().catch(() => {}))
      if (!result.ok) {
        console.error("[database] migrate failed:", result.failure)
        return { ok: false, reason: "migrate-failed", code: result.failure.code }
      }
      const applied = result.value.applied.map((entry) => entry.dirName)
      console.info(`[database] ${applied.length} migration(s) applied by ${startedBy}: ${applied.join(", ")}`)
      return { ok: true, applied, backupKey }
    } finally {
      await lock.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {})
    }
  } finally {
    await lock.end().catch(() => {})
  }
}
