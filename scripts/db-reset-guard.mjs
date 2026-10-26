/**
 * Decides whether `pnpm db:reset` may wipe the database a URL points at.
 *
 * Kept pure and separate from scripts/db-reset.mjs so the rules are tested
 * (db-reset-guard.test.mjs): this is the one check standing between a typo in
 * an env file and a dropped production database.
 *
 * The rules, in order:
 *  1. Never in production: NODE_ENV or VERCEL_ENV says so → refuse.
 *  2. A local host (localhost, 127.0.0.1, ::1, *.localhost, a Docker service
 *     named db or postgres) → allowed.
 *  3. Any other host must be listed in DB_RESET_ALLOW_HOSTS (comma separated,
 *     matched as a prefix of the hostname, so a Neon endpoint id like
 *     "ep-old-rain-b5v5edey" covers its pooled and direct hosts) → allowed.
 *  4. Everything else → refused, with the host named so the fix is obvious.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db", "postgres"])

/** Whether a hostname is this machine or a local Docker service. */
export function isLocalHost(hostname) {
  const host = hostname.toLowerCase()
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost")
}

/** Parses the comma-separated allow-list, ignoring blanks. */
export function parseAllowHosts(value) {
  return (value ?? "")
    .split(",")
    .map((entry) => withoutNeonPooler(entry.trim().toLowerCase()))
    .filter(Boolean)
}

/** `ep-x-pooler.region.aws.neon.tech` → `ep-x.region.aws.neon.tech`; other hosts unchanged. */
export function withoutNeonPooler(hostname) {
  return hostname.replace(/^(ep-[a-z0-9-]+?)-pooler(\.|$)/, "$1$2")
}

/**
 * The URL schema changes should use. Neon's `-pooler` hosts go through
 * PgBouncer in transaction mode, which breaks the session-level work Prisma
 * does while building a schema, so they are switched to the direct host of
 * the same endpoint. Any other URL is returned as it is.
 */
export function toDirectUrl(url) {
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
 * @param {{ url: string | undefined, env: Record<string, string | undefined> }} input
 * @returns {{ ok: true, host: string, database: string } | { ok: false, reason: string }}
 */
export function checkResetTarget({ url, env }) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    return { ok: false, reason: "refusing to reset: this environment is production" }
  }
  if (!url) {
    return { ok: false, reason: "no database URL: set DATABASE_URL (or DIRECT_URL) first" }
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: "the database URL is not a valid URL" }
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return { ok: false, reason: `not a PostgreSQL URL (${parsed.protocol})` }
  }

  const host = withoutNeonPooler(parsed.hostname.toLowerCase())
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "postgres"

  if (isLocalHost(host)) return { ok: true, host, database }

  const allowed = parseAllowHosts(env.DB_RESET_ALLOW_HOSTS)
  if (allowed.some((prefix) => host === prefix || host.startsWith(prefix))) {
    return { ok: true, host, database }
  }

  return {
    ok: false,
    reason:
      `refusing to reset the remote database at ${host}. If it is a development database, ` +
      `add its host (or Neon endpoint id) to DB_RESET_ALLOW_HOSTS in .env.local.`,
  }
}
