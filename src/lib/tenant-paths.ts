import type { Route } from "next"

/**
 * URLs of a tenant's dashboard (spec/13-conventions.md: `/t/[slug]/<page>`;
 * phase 1, task 1.7). One builder, so a page, a link and a redirect never
 * spell the path differently.
 */
export function tenantPath(slug: string, page = ""): Route {
  const rest = page.replace(/^\/+|\/+$/g, "")
  return `/t/${slug}${rest ? `/${rest}` : ""}` as Route
}

/**
 * The way into the dashboard when no tenant is known yet: it redirects to the
 * last tenant opened, else the oldest membership. Typed routes see the
 * optional catch-all behind it, not the bare path.
 */
export const DASHBOARD = "/dashboard" as Route

/**
 * Where an old `/dashboard/…` URL goes: the same page under the tenant, with
 * its query string. Bookmarks, emails and Stripe return URLs keep working.
 */
export function dashboardRedirectTarget(slug: string, rest: readonly string[], query: string): Route {
  const path = tenantPath(slug, rest.map(encodeURIComponent).join("/"))
  return (query ? `${path}?${query}` : path) as Route
}
