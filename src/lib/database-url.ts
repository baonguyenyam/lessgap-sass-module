/**
 * The database URL that schema work and long reads should use.
 *
 * Kept free of imports and of non-erasable TypeScript, so the scripts import it
 * directly under Node's type stripping (`#src/lib/database-url.ts`).
 */

/** `ep-x-pooler.region.aws.neon.tech` → `ep-x.region.aws.neon.tech`; other hosts unchanged. */
export function withoutNeonPooler(hostname: string): string {
  return hostname.replace(/^(ep-[a-z0-9-]+?)-pooler(\.|$)/, "$1$2")
}

/**
 * The URL schema changes should use. Neon's `-pooler` hosts go through
 * PgBouncer in transaction mode, which breaks the session-level work Prisma
 * does while building a schema (and a cursor held across a long dump), so they
 * are switched to the direct host of the same endpoint. Any other URL is
 * returned as it is.
 */
export function toDirectUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const direct = withoutNeonPooler(parsed.hostname)
    if (direct === parsed.hostname) return url
    parsed.hostname = direct
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * The connection for schema work, backups and other owner-level jobs (spec/12,
 * "Database roles"): `DATABASE_URL_MIGRATE` (the owner role) when set, then
 * `DIRECT_URL`, then `DATABASE_URL`, on the direct host. Until the roles are
 * set up, `DATABASE_URL` is the owner and this returns it.
 */
export function ownerUrl(env: Record<string, string | undefined>): string | null {
  const url = env.DATABASE_URL_MIGRATE?.trim() || env.DIRECT_URL?.trim() || env.DATABASE_URL?.trim()
  return url ? toDirectUrl(url) : null
}
