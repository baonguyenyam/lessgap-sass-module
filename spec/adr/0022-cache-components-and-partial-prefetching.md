# 0022. Adopt Cache Components and Partial Prefetching, site surface first

**Status:** accepted (by the product owner, 2026-10-27)
**Date:** 2026-10-27

## Context
The owner asked for the best stable features of the installed Next.js
(16.4.3). Typed routes, `error.tsx` boundaries, `loading.tsx` skeletons and a
view transition are in. The two that remain are the largest:

- **Cache Components** (`cacheComponents: true`, stable since 16.0). Pages are
  prerendered into a static shell; anything that reads the request (`cookies()`,
  `headers()`, `searchParams`, `params`) must sit behind `<Suspense>` or be
  cached with `"use cache"` (server, keyed by its arguments),
  `"use cache: private"` (browser only, may read cookies) or
  `"use cache: remote"`. Invalidation is by `cacheTag` + `revalidateTag` /
  `updateTag`. Pages are kept alive with React `<Activity>` on navigation, so
  component state survives a round trip.
- **Partial Prefetching** (`partialPrefetching: true`, requires Cache
  Components). A `<Link>` prefetches the destination's App Shell (static and
  cached content, including cached session content) once per route. The docs
  say the next major release enables both everywhere and removes the flags.

The Next docs (`node_modules/next/dist/docs/01-app/02-guides/`:
`instant-navigation.md`, `migrating-to-cache-components.md`,
`adopting-partial-prefetching.md`, `authentication-with-cache-components.md`,
`preserving-ui-state.md`) describe an incremental path: turn the flag on, mark
unready segments `export const instant = false`, fix synchronous IO, then
convert one route at a time.

The spec already plans caching for the platform: tenant site pages cached per
host and revalidated by tag, host → tenant and entitlements cached per tenant
([01-architecture.md](../01-architecture.md#caching)); "dashboard pages are
dynamic" ([13-conventions.md](../13-conventions.md)); caches keyed by tenant
([multi-tenancy rules](../../.agents/rules/multi-tenancy.md)). Cache Components
is the mechanism those lines need; with the old model they would be built on
`unstable_cache`, which still works under Cache Components but is the older
API the docs recommend moving off (`"use cache"`, `cacheLife`, `cacheTag`).

### What blocks the flag today (audit of 2026-10-27)

Turning `cacheComponents` on as the code stands breaks the build or makes
every route block. Each item is a concrete change:

| Where | What it reads | Under Cache Components |
| --- | --- | --- |
| `src/app/layout.tsx` | `await getLocale()` for `<html lang>` | Request-bound root: nothing below can prerender. Needs a lang that does not read the request (from the `[locale]` param on the public site; an inline script or a fixed default in the app areas) |
| `src/i18n/request.ts` | `cookies()` (app locale), `getViewerSettings()` (session), `now: new Date()` | Synchronous IO in prerender is a build error that `instant = false` does not clear. `now` must come from `connection()` inside a boundary or move to the client (`useNow`) |
| `src/platform/settings/store.ts` | in-process TTL cache with `Date.now()` | Replace with `"use cache"` + `cacheTag("platform-settings")` + `cacheLife`; `saveSettings` calls `updateTag`. Also fixes "another instance sees a change within 30 s" |
| `src/platform/settings/tenant-store.ts` | `getViewerSettings` reads the session; `getTenantSettings(tenantId)` | Split: resolve the user and tenant outside, cache `getTenantSettings` by `tenantId` with `cacheTag("tenant-settings:" + id)`; user rows by `userId` |
| `src/lib/auth/index.ts` | `headers()` for the Better Auth session | Every caller must be inside `<Suspense>`. Candidate for `"use cache: private"`, but Better Auth validates against the database and its 60 s cookie cache (spec/10): to be tested, not assumed |
| `(dashboard)/layout.tsx`, `(admin)/layout.tsx` | top-level `await requireUser()` / `getCurrentUser()` | Holds the whole segment. Push the user read into a component behind a boundary (the shell renders, the user menu streams) |
| `components/layout/app-shell/app-shell.tsx` | `cookies()` for `sidebar_state` | Same: behind a boundary, or read on the client |
| `components/landing/navbar.tsx` | `getCurrentUser()` (signed-in button) | The only reason the public pages are dynamic (see `next.config.ts`). Behind a small boundary, the rest of each public page becomes a static shell |
| `[locale]/(public)/privacy`, `terms`, `cookies` | `new Date()` as "Last updated" | Build error. Also a bug today: the date is always the day of the request. Replace with a fixed date per document |
| `(auth)/layout.tsx`, `app/not-found.tsx` | `new Date().getFullYear()` | Build error. Year from a cached function or the client |
| `[locale]/(public)/newsletter/confirm` | `Date.now()` for the confirm window | Behind `connection()` inside a boundary (it is per-request anyway) |
| `api/health`, `api/cron/reset-demo` | `export const dynamic = "force-dynamic"` | Segment config errors under the flag; remove it. A `GET` handler that reads nothing at request time is prerendered, so `health` (which reads no request data) must call `await connection()` first, or it would report the build's state forever |
| 11 server actions | `revalidatePath(...)` | Keep working. Data cached with tags moves to `updateTag` (read-your-own-writes) |

### Routes, per request reads

- **Public `[locale]` pages (10).** Static content plus the navbar session.
  `newsletter/confirm` and `unsubscribe` read `searchParams` and the database.
  After the navbar change: static shell, instant from the CDN.
- **Sign-in pages `(auth)` (6).** Read `searchParams` (errors, callback) and
  config. Static shell with the form; the message strip behind a boundary.
- **Dashboard (22 page folders).** Every page reads the session; lists read
  `searchParams` (table query) and tenant settings (page size, time zone).
  Shell (sidebar, header, page title) can prerender; the data streams behind
  the boundary we already have (`loading.tsx` with `PageSkeleton`). Caching
  tenant data across requests here is a choice, not a requirement.
- **Admin (7).** ROOT only, low traffic. Same shape as the dashboard; least
  benefit.
- **Route handlers (11).** Unaffected except for the two `dynamic` exports.
- **Phase 3 sites (`app/sites/[host]`, not built yet).** The main beneficiary:
  the spec's "cached per host, revalidated by tag" is exactly `"use cache"` +
  `cacheTag(siteTag(tenantId))` + `updateTag` on save.

### What `<Activity>` would change

Pages are hidden, not unmounted, for up to three routes:

- **Drawers** (`src/stores/drawer.ts`): the store is global. A drawer left
  open when navigating away is still open on return. Close it on navigation
  (`onNavigate` on links, or a `useLayoutEffect` cleanup in `FormDrawer`).
- **Dropdowns, popovers, the row action menu, the search dialog**: reopen on
  back. Same cleanup.
- **`DataTable` search box**: keeps its typed value. It is mirrored from the
  URL, so it stays consistent; confirm with a test.
- **Forms**: unsaved input survives a round trip (good for long settings
  forms); success toasts and `useActionState` results also survive and must be
  reset on submit.
- **`navigation-overlay.tsx`**: its link overlay ends on a `pathname` change;
  a back navigation to a preserved page may render without the effects it
  waits for. With partial prefetching the overlay should become unnecessary;
  plan to remove it rather than adapt it.

## Decision
Accepted by the owner on 2026-10-27, with the answers recorded under
"Owner's answers" below.

1. **Adopt both, in four steps, one PR each**, after the owner answers the
   questions below:
   1. **Unblock.** Fix the synchronous IO (legal dates, years, confirm window,
      `now` in i18n), remove the two `dynamic` exports, turn on
      `cacheComponents` and `partialPrefetching`, and mark every server page
      and layout `instant = false` (what the codemod
      `cache-components-instant-false` does). Behaviour unchanged; build green.
      `<html lang>` stays request-bound until step 3: with every segment opted
      out it blocks nothing new, and moving it means splitting the root layout,
      which only pays off once the public pages prerender.
   2. **Settings caches.** Platform and tenant settings through `"use cache"`
      with tags keyed by tenant, `updateTag` on save. Removes the 30 s
      cross-instance staleness.
   3. **Public site and sign-in pages instant.** `<html lang>` off the
      request (a root layout per area, the public one under `[locale]`),
      navbar session behind a boundary, remove `instant = false` there. Playwright `instant()` tests
      lock it in.
   4. **Dashboard and admin shells.** User read moved out of the layouts,
      Activity cleanups (drawers, menus), `instant = false` removed route by
      route.
2. **Phase 3 site pages are built on Cache Components from the start**, using
   tags per tenant as spec/01 describes.
3. **Rules that hold throughout:** every `"use cache"` that touches tenant
   data takes the tenant id as an argument and tags with it; nothing
   tenant-specific under a global key; session data is never cached on the
   server under a key that does not include the user id.

### Owner's answers (2026-10-27)
- **Rollout:** all four steps.
- **PR size:** one PR per step.
- **Server caches for tenant data:** yes, keyed by tenant id and invalidated
  on save.
- **Session cache in the browser:** not now. The current user is read per
  request.
- **The navigation overlay:** remove it once prefetching makes it redundant
  (step 3 or 4).

### Questions that were put to the owner
- **Rollout:** all four steps, or stop after step 3 (public pages instant,
  dashboard as today)?
- **PR size:** one PR per step as above, or step 1 alone first and decide the
  rest after measuring?
- **Server caches for tenant data:** may tenant settings (and later
  entitlements, member lists) be cached on the server, keyed by tenant id,
  invalidated on save? Or only per request, as today?
- **Session cache:** may the current user be cached in the browser with
  `"use cache: private"` (faster navigations, a sign-out on another device
  shows after the cache life), or always read per request?
- **The navigation overlay:** remove it once prefetching makes it redundant?

### Step 1 findings (2026-10-27)
Two blockers the audit did not list, found by `pnpm build` and the dev overlay:

- **Every Prisma 8 query mints a random id** (`crypto.randomUUID()` in the
  ORM's statement runner), which Cache Components refuses in a prerender, just
  like the clock. A query that runs before any request data has been read must
  wait for the request (`await io()`), or be cached with `"use cache"`. In step
  1 that is the platform settings read (`store.ts`), the landing's plans
  (`plan-pricing.tsx`) and the dev-only setup probe (`setup-status.ts`); steps
  2 and 3 cache the first two.
- **Synchronous `useTranslations` in a Server Component** failed the prerender
  with React's "Expected a suspended thenable". Server Components use
  `await getTranslations()`; the hook stays for Client Components.

## Consequences
- Public pages served as static shells; dashboard navigations show the shell
  and skeleton at once, with the data streaming in.
- Settings changes visible on every instance at once, not after 30 s.
- The phase 3 caching plan has its mechanism.
- Harder: every new page must place request reads behind a boundary (the dev
  overlay and the build enforce it); Activity means component state no longer
  resets on navigation, which needs cleanups in transient UI; more concepts
  for contributors (`"use cache"`, `cacheLife`, `cacheTag`, `instant`).
- Spec to update on acceptance: 13-conventions ("dashboard pages are dynamic"
  becomes "dashboard data streams behind Suspense"), 01-architecture
  (caching mechanism named), `.agents/rules/nextjs-react.md`.

## Options considered
- **Stay on the current model.** Works, but leaves every page dynamic, keeps
  the 30 s settings staleness, and the phase 3 site cache would have to be
  built on `unstable_cache`, the older API. The next major release turns both
  flags on and removes them, so the migration is deferred, not avoided.
- **Flip the flag on and fix everything in one change.** Touches every route
  and layout at once; the docs advise against it and a regression would be
  hard to locate.
- **Cache Components without Partial Prefetching.** Next logs a warning until
  the option is set either way, and the navigation benefit comes mostly from
  the App Shell prefetch. Kept only as a fallback for step 1 if a prefetch
  issue appears.
