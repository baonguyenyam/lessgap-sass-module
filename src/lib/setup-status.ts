/**
 * What the first run is still missing, so the public pages can say it instead
 * of failing. The landing and the pricing page read their plans from the
 * database: before one exists they used to render a stack trace, which is the
 * first thing a new clone showed.
 *
 * Development only. In production a missing database is a real fault, not a
 * setup step: a visitor must never read installation instructions, and
 * `/api/health` and `npm run check:deploy` are what report it there.
 */
import { io } from "next/cache"

export type SetupStep = "database-url" | "database-unreachable" | "migrations"

/**
 * Maps the failure of the first cheap query onto the step that fixes it.
 * Prisma 8 reports a server it cannot reach (or a refused login) as an error
 * caused by a `SqlConnectionError`, and a URL that is not one as
 * `RUNTIME.BINDING_INVALID`; anything else at this point means the
 * connection worked and the tables are not there yet.
 */
export function stepFromError(error: unknown): SetupStep {
  const e = error as { code?: string; cause?: { name?: string } } | null
  return e?.code === "RUNTIME.BINDING_INVALID" || e?.cause?.name === "SqlConnectionError"
    ? "database-unreachable"
    : "migrations"
}

/** The step to show, or null when there is nothing to say. */
export async function pendingSetup(): Promise<SetupStep | null> {
  if (process.env.NODE_ENV === "production") return null
  if (!process.env.DATABASE_URL) return "database-url"
  // At request time: the probe query mints ids that Cache Components refuses
  // while a page prerenders (spec/adr/0022). Development only, see above.
  await io()
  try {
    // Imported here: a malformed DATABASE_URL throws while the client is built.
    const { db8 } = await import("@/lib/db8")
    await db8.orm.public.Plan.aggregate((a) => ({ n: a.count() }))
    return null
  } catch (error) {
    return stepFromError(error)
  }
}
