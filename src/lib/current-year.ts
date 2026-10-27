import { cacheLife } from "next/cache"

/**
 * The current year, for copyright lines.
 *
 * Under Cache Components a bare `new Date()` while a page prerenders is a build
 * error (spec/adr/0022). Cached here, the year is part of the static shell and
 * refreshed daily, so a page that shows it can still prerender.
 */
export async function currentYear(): Promise<number> {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}
