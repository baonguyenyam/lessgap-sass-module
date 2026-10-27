import { MIGRATIONS } from "@/generated/migrations"
import { contract, db8 } from "@/lib/db8"
import { pendingMigrations, type MigrationEdge } from "@/lib/migration-chain"

/**
 * Whether the database this deployment talks to is at the contract the code
 * was built with.
 *
 * Builds do not run migrations, and a database that is behind does not fail on
 * its own. Every query that does not name the missing column keeps working,
 * until one does. That is how a deployment can answer every public page
 * correctly and then fail the first sign-in.
 *
 * Prisma 8 records where a database is in its marker
 * (`prisma_contract.marker.core_hash`, one row per contract space; ours is
 * `app`). The code expects the storage hash of its contract. Equal means
 * aligned; otherwise the migration graph compiled into the build
 * (src/generated/migrations.ts) says how many migrations are missing.
 *
 * What this reports, and what it deliberately does not:
 *
 * - A boolean and a count, never hashes or migration names. It feeds
 *   /api/health, which is public.
 * - null when the database cannot be asked, and a null count when the marker
 *   is on no path to the contract (changed outside the migration system, or
 *   built from another branch). Unknown is a different answer from behind.
 */

export type SchemaStatus = { aligned: boolean | null; pending: number | null }

/** Reads the marker hash of the `app` space; null when the database was never signed or migrated. */
export type MarkerReader = () => Promise<string | null>

export function createSchemaStatus(
  edges: readonly MigrationEdge[],
  target: string,
  read: MarkerReader,
  timeoutMs = 2000
): () => Promise<SchemaStatus> {
  // Aligned is remembered for the life of the instance, which keeps the
  // endpoint at one query per instance: a deploy cannot un-apply a migration.
  // Behind and unknown are never remembered. The next thing that happens after
  // a failed check is somebody applying the migration and checking again, and a
  // warm instance that kept its old answer would fail a database that is now
  // fine.
  let aligned = false

  return async () => {
    if (aligned) return { aligned: true, pending: 0 }
    try {
      const marker = await withTimeout(read(), timeoutMs)
      if (marker === target) {
        aligned = true
        return { aligned: true, pending: 0 }
      }
      const pending = pendingMigrations(edges, marker, target)
      return { aligned: false, pending: pending?.length ?? null }
    } catch {
      return { aligned: null, pending: null }
    }
  }
}

/**
 * True when an error means the marker table does not exist, however the driver
 * chose to wrap it: Postgres code 42P01 (undefined table) or 3F000 (undefined
 * schema), carried in `code`, in the message, or in a nested `cause`.
 */
export function isUndefinedTable(error: unknown): boolean {
  const seen = new Set<unknown>()
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object" || seen.has(value)) return false
    seen.add(value)
    const e = value as Record<string, unknown>
    if (e.code === "42P01" || e.code === "3F000" || e.originalCode === "42P01") return true
    if (
      typeof e.message === "string" &&
      (e.message.includes("42P01") || /"?prisma_contract(\.marker)?"? does not exist/.test(e.message))
    ) {
      return true
    }
    return visit(e.meta) || visit(e.cause)
  }
  return visit(error)
}

async function readMarkerFromDatabase(): Promise<string | null> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  try {
    const plan = db8.raw.sql`
      SELECT core_hash FROM prisma_contract.marker WHERE space = 'app'
    `
      .returnsRow({ core_hash: "pg/text@1" })
      .build()
    const rows = await db8.query(plan)
    return rows[0]?.core_hash ?? null
  } catch (error) {
    // No marker table means the database was never migrated or signed.
    if (isUndefinedTable(error)) return null
    throw error
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms} ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export const getSchemaStatus = createSchemaStatus(MIGRATIONS, contract.storage.storageHash, readMarkerFromDatabase)
