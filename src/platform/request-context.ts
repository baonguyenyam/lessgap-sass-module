/**
 * What the proxy stamps on every request so an error can say which request
 * and which surface it came from (spec/16-operations.md, "Errors and request
 * tracing"). Pure, so the proxy and the logger agree and both are tested.
 */

export const REQUEST_ID_HEADER = "x-request-id"
export const REQUEST_SOURCE_HEADER = "x-request-source"
/** The tenant of a `/t/<slug>/…` request, set (and otherwise removed) by the proxy, never by the client. */
export const TENANT_SLUG_HEADER = "x-tenant-slug"
/** The tenant whose dashboard was opened last, kept by the proxy so `/dashboard` lands there again. */
export const LAST_TENANT_COOKIE = "last_tenant"

export const ERROR_SOURCES = ["marketing", "dashboard", "platform", "site", "api", "cron", "job"] as const
export type ErrorSource = (typeof ERROR_SOURCES)[number]

export function isErrorSource(value: unknown): value is ErrorSource {
  return typeof value === "string" && (ERROR_SOURCES as readonly string[]).includes(value)
}

/**
 * An incoming request id worth keeping (from a load balancer or an upstream
 * service), or null: letters, digits and dashes, 8 to 128 characters, so a
 * header cannot smuggle anything into logs.
 */
export function acceptRequestId(value: string | null | undefined): string | null {
  return value && /^[A-Za-z0-9-]{8,128}$/.test(value) ? value : null
}

/** The surface a path belongs to. Phase 3 adds `site` for tenant hosts. */
export function sourceForPath(pathname: string): ErrorSource {
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  if (under("/api/cron")) return "cron"
  if (under("/api")) return "api"
  if (under("/admin")) return "platform"
  if (
    ["/dashboard", "/t", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-request", "/2fa"].some(
      under
    )
  ) {
    return "dashboard"
  }
  return "marketing"
}

/** The slug in a tenant dashboard path, `/t/<slug>` or `/t/<slug>/…`, or null. */
export function tenantSlugFromPath(pathname: string): string | null {
  return /^\/t\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/.exec(pathname)?.[1] ?? null
}
