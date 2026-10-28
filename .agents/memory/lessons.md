# Lessons

Read before every task. Format and rules: [README.md](./README.md). Newest first.

### 2026-10-28 · next · `notFound()` in a layout cannot send a 404 once the shell streams
- **Symptom:** the T6 E2E got status 200 for a tenant the user was not a member of; the 404 page rendered, but late.
- **Cause:** with Cache Components the static shell (and `loading.tsx`) streams before the layout's membership check, and the status is fixed when streaming starts.
- **Fix:** the proxy checks membership (`isTenantMember`) and rewrites to `/_not-found` with `{ status: 404 }`; the layout keeps its own check.
- **Rule:** when the HTTP status matters (404/403/401), decide it in the proxy or before any await or Suspense; assert the status in E2E, not only the page text.

### 2026-10-28 · next · A layout and a page of the same request run in parallel
- **Symptom:** "Organization already exists" on a new account's first `/dashboard`, about one run in five.
- **Cause:** the dashboard layout and the redirect page both called `ensureTenant`, and both created the tenant.
- **Fix:** `ensureTenant` wrapped in React `cache()` and, when the create loses the race, a short wait for the winner's membership.
- **Rule:** a get-or-create called from more than one segment is `cache()`d and tolerates a concurrent create; repeat the E2E (`--repeat-each`) before trusting it.

### 2026-10-28 · e2e · The running dev server may serve stale code
- **Symptom:** E2E against the owner's `pnpm dev` on :3000 rendered links like `/t//settings` that the source could not produce.
- **Fix:** ran the specs against a fresh `pnpm build` served by `next start -p 3100` (`E2E_BASE_URL=http://localhost:3100`), leaving the owner's server alone.
- **Rule:** verify route moves against a fresh build on a separate port; never stop the owner's dev server.

### 2026-10-28 · better auth · The organization plugin checks its own statements
- **Symptom:** `auth.api.createOrgRole` answered "You are not allowed to create a role" for the tenant owner.
- **Cause:** the plugin authorises its endpoints against `ac`, `member`, `invitation` and `organization` statements; the access control was built from the product catalog alone, so no role held them.
- **Fix:** `tenantAc` includes the plugin's `defaultStatements`, and `withPluginGrants` derives them from product permissions for built-in and custom roles.
- **Rule:** an endpoint of a Better Auth plugin is exercised in an integration test with a real session before its feature is called done.

### 2026-10-28 · prisma 8 · A migration that leaves the contract unchanged is refused
- **Symptom:** `prisma migration check` failed with `MIGRATION.CHECK_NOOP_SELF_EDGE` on a `migration new --from <current hash>` package holding only `rawSql` (database roles).
- **Cause:** a self-edge needs an operation with an `invariantId`, and the runner takes an invariant edge only when the target ref requires it; `pnpm db:migrate` would never run it.
- **Fix:** database roles moved to `scripts/db-roles.mjs` (`pnpm db:roles`).
- **Rule:** cluster-level setup with no contract counterpart (roles, grants) is an idempotent script run once per database, not a migration.

### 2026-10-27 · vitest · Integration files sharing one database must not run in parallel
- **Symptom:** after a fourth integration file was added, the smoke test and the job test failed with rows "undefined" right after inserting them; each file passed alone.
- **Cause:** every file truncates the shared test database in `beforeEach`; Vitest ran the files in parallel workers, so one file wiped another's rows mid-test.
- **Fix:** `fileParallelism: false` in `vitest.integration.config.mts`.
- **Rule:** integration tests share one database and run file by file; a test that passes alone and fails in the suite is checked for shared state first.

### 2026-10-27 · prisma 8 · Raw SQL takes no `null`, and `affectedCount()` needs `build()`
- **Symptom:** `RUNTIME.RAW_SQL_UNSUPPORTED_INTERPOLATION` for a `null` value in ``db8.raw.sql`…` ``, then `Cannot read properties of undefined (reading 'collectParamRefs')` from `db8.execute`.
- **Cause:** the raw lane infers a codec from each interpolated value and has none for `null` (`param()` is not exported by the façade); `.affectedCount()` returns a builder, not a plan.
- **Fix:** pass `value ?? ""` and write `NULLIF(${value}, '')` in SQL; end with `.affectedCount().build()` before `db8.execute(plan)`.
- **Rule:** every raw statement ends in `.build()`; nullable values go through `NULLIF` (or the ORM).

### 2026-10-27 · next · `instrumentation.ts` is loaded once per server start
- **Symptom:** after adding `onRequestError`, errors in the running `pnpm dev` wrote no `ErrorReport` row.
- **Cause:** the dev server loads instrumentation when it starts; edits to it do not reach a running server.
- **Fix:** checked on `pnpm build` + `next start -p 3200` instead of stopping the owner's dev server.
- **Rule:** after editing `instrumentation*.ts`, restart the dev server (or check on a separate production start) before judging it.

### 2026-10-27 · ESLint · Use explicit regex exceptions for import boundaries
- **Symptom:** an allowed module public path was still rejected by `no-restricted-imports`, and `Linter.verify` fixtures reported no matching config.
- **Cause:** the rule's grouped patterns did not provide the whitelist behavior assumed, and ESLint 10's flat `Linter` needs matching `files` extensions plus a `filename` option.
- **Fix:** use a regex with a negative lookahead for the public module paths; give fixture linting `.ts`/`.tsx` patterns and `verify(..., { filename })`.
- **Rule:** exercise real allowed and denied import examples against the installed ESLint version before relying on pattern semantics.

### 2026-10-27 · Shell · Remove only generated fixtures by exact path
- **Symptom:** the shell policy rejected `rm -rf` while cleaning up the module generated for the scaffold check.
- **Cause:** broad recursive deletion commands are blocked by the command guard.
- **Fix:** remove only the known generated fixture with `node:fs` and an exact path.
- **Rule:** use scoped cleanup commands for generated test fixtures; never broaden a deletion target to bypass a shell guard.

### 2026-10-27 · Vitest · Explicit test paths still obey `include`
- **Symptom:** `vitest run tests/contract/modules.test.ts` reported no test files even though the path was explicit.
- **Cause:** the shared Vitest `include` matched only `tests/unit`, so the contract test remained filtered out.
- **Fix:** include `tests/contract/**/*.test.ts` in the config before invoking a contract test by path.
- **Rule:** check the active Vitest include/exclude patterns when a direct test path is not discovered.

### 2026-10-27 · Intl · `timeZoneName` cannot accompany `dateStyle` and `timeStyle`
- **Symptom:** formatting a Temporal instant threw `TypeError: Invalid option : option` in the time-zone formatter.
- **Cause:** this runtime's `Intl.DateTimeFormat` rejects `timeZoneName` when date/time styles are supplied.
- **Fix:** specify the year, month, day, hour and minute fields individually alongside `timeZoneName`.
- **Rule:** use explicit date/time component options when the output needs a zone abbreviation; verify Intl option combinations in the supported runtime.

### 2026-10-27 · vitest · Global setup and worker setup have separate environments
- **Symptom:** the integration database migration succeeded, then the test worker rejected its own `DATABASE_URL` as if it were the production database.
- **Cause:** global setup changed `DATABASE_URL` to the isolated test URL, and the worker ran the same safety check after inheriting that value.
- **Fix:** keep the database identity guard and migration in `global-setup.ts`; let `setup.ts` only set the worker's `DATABASE_URL`.
- **Rule:** keep once-per-run database checks in Vitest `globalSetup`; worker `setupFiles` must not repeat checks against environment values already rewritten for tests.

### 2026-10-27 · vitest · bcrypt tests time out under the full suite
- **Symptom:** `password.test.ts > accepts the right password and rejects the wrong one` failed once in the full run and passed alone and on the rerun.
- **Cause:** bcrypt at cost 12 is deliberately slow; with 70 test files in parallel workers, two hashes in one test passed the 5 s default.
- **Fix:** a 20 s timeout on the hashing tests.
- **Rule:** a test that does deliberately slow work (bcrypt, the full auth config) gets an explicit timeout; a test that fails only under load is a timeout, not a pass.

### 2026-10-27 · browser checks · A streamed page holds a hidden second copy
- **Symptom:** checking a settings page in dev, `document.querySelectorAll('button[role=combobox]')` returned two selects, one empty, and the empty one looked like a bug in the new settings cache.
- **Cause:** with Cache Components the streamed HTML keeps a hidden `<div hidden id="S:0">` copy of the page until React swaps it in; the server values were right.
- **Rule:** when reading the page from a script, filter to visible elements (`el.offsetParent`), and confirm a save in the database before blaming a cache.

### 2026-10-27 · prisma 8 · Every query is "randomness" to Cache Components
- **Symptom:** with `cacheComponents: true`, `pnpm build` failed on `/en/about`: "encountered the unstable value `crypto.randomUUID()` while prerendering", pointing at a `PlatformSwitch` read; in dev the landing showed the same for `Plan` reads.
- **Cause:** Prisma 8's statement runner mints a `randomUUID()` per query. A query that runs before the page has read any request data happens during the prerender, where randomness is refused like the clock.
- **Fix:** `await io()` (from `next/cache`) before such a query, or cache the function with `"use cache"`.
- **Rule:** promoted to `.agents/rules/nextjs-react.md`. Dev-only code paths (the setup probe) are not exercised by `pnpm build`: open the page in dev too.

### 2026-10-27 · next-intl · `useTranslations` in a Server Component breaks the prerender
- **Symptom:** `Error: Expected a suspended thenable. This is a bug in React.` prerendering `/en/contact` after enabling Cache Components.
- **Cause:** the hook unwraps next-intl's async request config with `use()` inside a synchronous Server Component; while the config waits on request data during a prerender, React fails instead of suspending.
- **Fix:** `async` component + `await getTranslations()` (nine files converted).
- **Rule:** promoted to `.agents/rules/nextjs-react.md`.

### 2026-10-27 · next · Typed routes cannot see the public home at "/"
- **Symptom:** with `typedRoutes: true`, `href="/"`, `redirect("/")` and `href="/#pricing"` failed the typecheck, while every other page passed.
- **Cause:** the home page is `src/app/[locale]/(public)/page.tsx`, so the generated types know it only as `/${locale}`; the proxy serves the default language at "/" without a prefix.
- **Fix:** `HOME` in `src/config/site.ts` (`"/" as Route`); anchors on the home page cast with `as Route`.
- **Rule:** link to the home through `HOME`. If `tsc` reports odd route errors, run `npx next typegen` (`pnpm typecheck` does it first).

### 2026-10-27 · shadcn · A Sheet ignores a plain `sm:max-w-*` override
- **Symptom:** `FormDrawer` passed `sm:max-w-md` but every drawer opened at `max-w-sm`.
- **Cause:** the stock `SheetContent` sets `data-[side=right]:sm:max-w-sm`; the attribute selector gives it higher specificity, and `cn` does not merge classes with different variants.
- **Fix:** `form-drawer.tsx` overrides with the same prefix, `data-[side=right]:sm:max-w-*`.
- **Rule:** to override a stock class, repeat its full variant chain, then check the result in the browser.

### 2026-10-27 · tailwind · A flattened shadow must be transparent, not `none`
- **Symptom (avoided):** setting `--shadow-*: none` would drop focus rings with the shadows.
- **Cause:** Tailwind composes `box-shadow` from ring and shadow variables in one comma list; `none` inside a list makes the whole declaration invalid.
- **Fix:** `--shadow-*: 0 0 #0000` in `globals.css`.
- **Rule:** to switch off a box-shadow token, use a transparent shadow.

### 2026-10-27 · agents · Two agents built the same component in parallel
- **Symptom:** while one agent wrote a searchable select inside `option-select.tsx`, another committed `src/components/ui/searchable-select.tsx` doing the same job.
- **Fix:** kept one (`src/components/form/searchable-select.tsx`, out of `ui/`, which is stock shadcn only), and `OptionSelect` uses it.
- **Rule:** before adding a component, `git log --oneline -5` and search `src/components` (and `en.json` keys) for one that already does the job.

### 2026-10-27 · intl · The runtime lists some time zones under their old names
- **Symptom:** a search for "Ho Chi Minh" found no time zone.
- **Cause:** `Intl.supportedValuesOf("timeZone")` returns `Asia/Saigon`, not `Asia/Ho_Chi_Minh` (likewise Calcutta, Kiev, Rangoon, Katmandu).
- **Fix:** `timeZoneLabel` in `src/platform/settings/fields.ts` shows today's name first; the stored value stays the runtime's.
- **Rule:** never compare stored zones against modern IANA names; label them.

### 2026-10-27 · shadcn · Stock radix-nova components need their providers and wrappers
- **Symptom:** "`Tooltip` must be used within `TooltipProvider`" on every app page after the stock sidebar landed; "Cannot read properties of undefined (reading 'subscribe')" from `CommandInput`.
- **Cause:** the stock Tooltip no longer brings its own provider, and the stock `CommandDialog` does not wrap its children in `<Command>`. Studio Admin does both in its own code.
- **Fix:** `<TooltipProvider>` in `src/app/layout.tsx`; `<Command>` inside `CommandDialog` in `search-dialog.tsx`.
- **Rule:** when copying a stock component, read how the source project mounts it (root layout, wrappers), not only the component file.

### 2026-10-27 · tooling · Regex edits of JSX stop at the `>` of an arrow function
- **Symptom:** a script that moved `loading={x}` into `{x && <Spinner />}` produced `onClick={() =>\n{x && <Spinner />} run()}` and a broken file.
- **Cause:** the tag pattern `<Button[^>]*>` ended at the `>` of `() =>`.
- **Rule:** after a bulk JSX rewrite, grep every changed spot before typechecking; prefer one file at a time where tags hold arrow functions.

### 2026-10-27 · vitest · Importing the whole auth config can pass the 5s default
- **Symptom:** `tests/unit/auth-schema.test.ts` timed out one run in three under the full suite, and passed alone.
- **Fix:** a 30s timeout on that test.
- **Rule:** a test that imports `@/auth` (every plugin) gets an explicit longer timeout.

### 2026-10-27 · spec · ADR numbers collide when agents work in parallel
- **Symptom:** a new ADR was written as 0017 while another agent had already added 0017, 0018 and 0019; a global `sed` renaming "ADR 0017" then rewrote references to the *other* 0017.
- **Cause:** the number was chosen from an old listing, and the rename matched text, not files.
- **Fix:** renumbered to 0020 and restored the other references by hand.
- **Rule:** run `ls spec/adr` right before choosing a number. When renumbering, change only links to the renamed file (`0017-application-stack.md`), never a bare "ADR 0017".

### 2026-10-27 · next-intl · A message key cannot contain a dot
- **Symptom:** every page logged `INVALID_KEY: Namespace keys cannot contain the character "."` after adding `admin.settings.fields["display.page_size"]`.
- **Cause:** next-intl reads a dot as nesting and refuses the whole message file.
- **Fix:** nest instead (`fields.display.page_size.label`); `t(`${key}.label`)` still resolves.
- **Rule:** `tests/unit/i18n/messages.test.ts` now fails on a dotted key.

### 2026-10-27 · tanstack table v9 · Resetting selection in an effect that depends on `table` loops
- **Symptom:** `Maximum update depth exceeded` from `DataTable` (`table_resetRowSelection` → `onRowSelectionChange`).
- **Cause:** `useTable` returns a new object each render; an effect on `[data, table]` reset the selection, which re-rendered, which ran the effect again. A new column array on every render made it worse.
- **Fix:** reset only when `data` actually changed (a ref holds the last rows), and `useMemo` the columns.
- **Rule:** keep TanStack Table inputs stable and never write table state from an effect without a guard. Read `node_modules/@tanstack/react-table/skills/` first: v9 is not v8.

### 2026-10-27 · next-intl · `relativeTime` needs one `now` for server and browser
- **Symptom:** hydration mismatch, "39 seconds ago" vs "29 seconds ago", and `ENVIRONMENT_FALLBACK: The now parameter wasn't provided`.
- **Fix:** `now: new Date()` in `src/i18n/request.ts`, and `format.relativeTime(date, useNow())` in client components.
- **Rule:** every relative time passes `now`.

### 2026-10-27 · prisma 8 · The dev client outlived a schema change
- **Symptom:** `Cannot read properties of undefined (reading 'select')` on `db8.orm.public.PlatformSwitch` right after adding the model, until the dev server restarted.
- **Cause:** `src/lib/db8.ts` keeps the client on `globalThis` across hot reloads; that client was built from the old contract.
- **Fix:** the cached client is now keyed by the contract's storage hash and rebuilt when it changes.
- **Rule:** nothing to remember any more; if a new model is "undefined" in dev, check that `pnpm db:emit` ran.

### 2026-10-27 · roles · The admin panel is ROOT only
- **Symptom:** the dev login account (ADMIN) was redirected from every `/admin` page.
- **Cause:** commit `8d80372` made `/admin` ROOT only in the proxy, the admin layout and the sidebar (system ROOT, tenant admins inside tenants).
- **Rule:** admin pages and admin actions check `isRoot`. Verifying them in a browser needs a ROOT session; the dev login is ADMIN.

### 2026-10-27 · better auth · A plugin's fields must be in the contract, and the check runs once
- **Symptom:** every page answered 500 with `BetterAuthError: Database schema mismatch — Missing columns Session.activeOrganizationId`.
- **Cause:** the organization plugin writes `Session.activeOrganizationId`; the `platform_tenants` migration added its tables but not that column. Better Auth checks the schema once when the server starts and keeps the result, so even after the migration the running `pnpm dev` kept failing until restarted.
- **Fix:** `activeOrganizationId String?` on `Session` in `prisma/contract.prisma`, migration `kit_session_active_organization`, then restart `pnpm dev`.
- **Rule:** `tests/unit/auth-schema.test.ts` now fails when a column Better Auth writes is missing from the contract. After `pnpm db:migrate`, restart the dev server before judging a schema error.

### 2026-10-26 · better auth · Never run `npx auth migrate` / `auth generate` here
- **Symptom:** `Only kysely adapter is supported for migrations` after Better Auth logged `Run \`npx auth migrate\` to add the missing tables and columns`.
- **Cause:** the auth CLI loads `src/auth.ts` without the app's env/bootstrap, so adapter detection fails — and even if it ran, it would write migrations outside our Prisma 8 migration graph.
- **Fix:** schema changes a plugin needs (organization, twoFactor, new `additionalFields`) go through `prisma/contract.prisma` → `pnpm db:emit` → `pnpm db:plan --name <owner>_<change>` → `pnpm db:migrate`. A "missing tables" log means the contract lacks tables/columns the plugins write — fix the contract.
- **Rule:** when Better Auth says a table or column is missing, add it to the contract and plan a migration; never run the auth CLI's migrate/generate.

### 2026-10-26 · next · A server component cannot call `buttonVariants()`
- **Symptom:** Settings → Backup rendered "This page couldn't load"; console: `Attempted to call buttonVariants() from the server but buttonVariants is on the client`.
- **Cause:** `src/components/ui/button.tsx` is `"use client"`, so every export is a client reference on the server, including the plain `cva` function.
- **Fix:** `<Button asChild variant=… size=…><a …/></Button>`.
- **Rule:** in a server component, style a link as a button with `<Button asChild>`, never `buttonVariants()`. Typecheck and lint do not catch this; open the page.

### 2026-10-26 · next · `useRenderedPathname` is relative to the layout that calls it
- **Symptom:** the settings tabs never showed the active page.
- **Cause:** inside `settings/layout.tsx` the hook returned "/security", not "/dashboard/settings/security" (`useSelectedLayoutSegments` starts below the calling layout).
- **Fix:** `useSelectedLayoutSegment()` in `src/components/settings/settings-nav.tsx`, compared with the part of each href after the settings base.
- **Rule:** in a nested layout, compare segments, not full paths.

### 2026-10-26 · next · Deleting a route leaves stale types in `.next/`
- **Symptom:** `pnpm typecheck` failed in `.next/types/validator.ts`: `Cannot find module '…/@modal/(.)settings/page.js'`.
- **Cause:** tsconfig includes the route types Next generated for the routes that existed then.
- **Fix:** `npx next typegen` regenerates them (or `pnpm dev` / `pnpm build`).
- **Rule:** after adding, moving or deleting a route, run `npx next typegen` before trusting a typecheck failure in `.next/`.

### 2026-10-26 · prisma 8 · `upsert` refuses a unique key that is an index
- **Symptom:** `conflictOn: { slug }` on `Plan.upsert` failed typecheck: "'slug' does not exist in type '{ id: string; }'".
- **Cause:** Prisma 8 types `conflictOn` from unique *constraints*; the baseline made every unique key a unique *index* (`@@index([...], unique: true)`). Postgres accepts either in `ON CONFLICT`.
- **Fix:** `conflictOn: uniqueIndexKey({ slug })` from `@/lib/db8`.
- **Rule:** promoted to `.agents/rules/database.md`.

### 2026-10-26 · prisma 8 · Timestamps are text, and `new Date(text)` is local time
- **Symptom (avoided):** pages formatted `new Date(row.createdAt)`; it compiles with a `TimestampString`, and is off by the machine's offset.
- **Cause:** the `timestamp(3)` columns read back as "YYYY-MM-DD HH:mm:ss.SSS" with no zone; JavaScript parses that as local time. Typecheck catches `Date` passed where text is expected, not `new Date(text)`.
- **Fix:** `toDate` / `toTs` / `nowTs` in `src/lib/timestamps.ts`.
- **Rule:** promoted to `AGENTS.md` and `.agents/rules/database.md`. Grep for `new Date(` on a column after touching queries.

### 2026-10-26 · prisma 8 · Error codes are dotted names, not `P1001`
- **Symptom:** the setup notice matched `P1000`/`P1001`/`P1013`, which Prisma 8 never throws.
- **Cause:** checked by running a query against `127.0.0.1:1`, an unresolvable host and `not-a-url`: a server it cannot reach throws `CONTRACT.MARKER_READ_FAILED` with `cause.name === "SqlConnectionError"`; a malformed URL throws `RUNTIME.BINDING_INVALID` when `db8` is constructed, at import.
- **Fix:** `stepFromError` in `src/lib/setup-status.ts`, which now imports `db8` inside its `try`.
- **Rule:** never match a Prisma 7 `P####` code; confirm a Prisma 8 code by triggering it before relying on it.

### 2026-10-26 · release · The version lives in three places
- **Symptom:** `changelog-real.test.ts` failed on `## [Unreleased]` ("has no date", "leads with the version the kit declares"), then `site.test.ts` failed on `2.6.0` vs `2.7.0`.
- **Cause:** the tests require the top CHANGELOG heading to be a dated release equal to `package.json` `version`, which must equal `siteConfig.version` in `src/config/site.ts`.
- **Fix:** `## [2.7.0] - 2026-10-26`, and the same number in `package.json` and `src/config/site.ts`.
- **Rule:** no `[Unreleased]` section here. A user-visible change goes under a dated version, and a new version is bumped in all three files at once.

### 2026-10-26 · better auth · A session or user `additionalField` is written on every insert
- **Symptom (avoided):** adding `session.additionalFields.switchedBy` makes Better Auth include the column in every new session, so sign-in fails everywhere until the column exists.
- **Cause:** Better Auth writes through Kysely with all declared fields; it does not check the schema.
- **Fix:** migration `kit_session_switch_as` planned and applied before the code runs.
- **Rule:** a new `additionalFields` entry ships with its migration, and the migration is applied (`pnpm db:migrate`) before that code is deployed.

### 2026-10-26 · imports · Plain Node scripts cannot use `@/`
- **Symptom:** a `scripts/*.mjs` file needed code from `src/`, and the only path that resolved was `../src/...`, which the import rule forbids.
- **Cause:** `@/` is a TypeScript path alias; `node` does not read `tsconfig.json`.
- **Fix:** Node's own subpath imports: `"imports": { "#src/*": "./src/*" }` in `package.json`, then `import … from "#src/lib/x.ts"`. The imported file must be erasable TypeScript with no `@/` value imports. Scripts that import `.ts` run with `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON` to silence a harmless warning.
- **Rule:** promoted to `.agents/rules/typescript.md`.

### 2026-10-26 · tooling · Agent sandboxes cannot reach Google Fonts
- **Symptom:** `pnpm build` fails with `next/font: Failed to fetch Geist from Google Fonts` in a sandbox with no outbound network.
- **Cause:** `next/font/google` downloads fonts at build time.
- **Fix:** none needed in code; CI (with network) builds normally.
- **Rule:** in an offline sandbox, verify with `pnpm typecheck`, `pnpm lint`, `pnpm test`; do not "fix" the font import.

### 2026-10-26 · tooling · `tsx` scripts with top-level await
- **Symptom:** `Top-level await is currently not supported with the "cjs" output format` running a `.ts` file with `tsx`.
- **Cause:** the package has no `"type": "module"`; `tsx` compiles a `.ts` file with only dynamic `import()` calls as CommonJS.
- **Fix:** name the script `.mts`, or give it a static `import` (as `prisma/seed.ts` does).
- **Rule:** one-off scripts that use top-level await are `.mts`.

### 2026-10-26 · pnpm · Use the pinned pnpm, not whatever is installed
- **Symptom:** `pnpm install --frozen-lockfile` fails with `ERR_PNPM_OUTDATED_LOCKFILE` (`shiki (lockfile: 4.5.0, manifest: ^4.5.0)`).
- **Cause:** pnpm 10 reads the specifiers in a pnpm 12 lockfile differently.
- **Fix:** run the version in `package.json` `packageManager` (`pnpm@12.8.1`; `npx pnpm@12.8.1` when it is not installed).
- **Rule:** never regenerate `pnpm-lock.yaml` with another pnpm major.

### 2026-10-26 · prisma 8 · Prisma 7 knowledge does not apply
- **Symptom:** `prisma migrate …`, `prisma generate`, `prisma db push` answer `CLI.COMMAND_MOVED`; `prisma db sign path/to/contract.json` fails with `MIGRATION.REF_NOT_FOUND`.
- **Cause:** Prisma 8 is a different CLI and model (contract, migration graph, marker). `db sign` takes a ref, hash or migration directory name, not a file path.
- **Fix:** use the `prisma-8` skill shipped with `@prisma/orm-postgres`; `db sign <migration-dir-name>`.
- **Rule:** promoted to `AGENTS.md` (Prisma 8 only) and `.agents/rules/database.md`.

### 2026-10-26 · prisma 8 · `migration plan` does not chain from the newest migration
- **Symptom:** a plan whose output says `from: (baseline)` although migrations exist, or `MIGRATION.PLAN_ORIGIN_UNKNOWN`.
- **Cause:** the origin is `--from`, else the `db` ref; nothing else.
- **Fix:** `pnpm prisma migration ref set db <newest to-hash>`, then plan.
- **Rule:** promoted to `.agents/rules/database.md` (advance the `db` ref after every plan).

### 2026-10-26 · prisma 8 · Contract and database must agree on defaults
- **Symptom:** `db verify --strict` reported `extra: database/public/TwoFactor/column:updatedAt/default`.
- **Cause:** Better Auth's two-factor plugin writes through Kysely and sends no timestamps, so the column needed a database default, which the contract did not declare.
- **Fix:** `@default(now()) @onUpdate(now())` on `TwoFactor.updatedAt` in `prisma/contract.prisma`.
- **Rule:** a column written outside the ORM (Better Auth, raw SQL) gets its default in the database, declared in the contract.

### 2026-10-26 · neon · Schema changes go through the direct host
- **Symptom:** schema operations through `…-pooler…` hosts are unreliable.
- **Cause:** Neon's pooler is PgBouncer in transaction mode.
- **Fix:** `toDirectUrl()` in `scripts/db-reset-guard.mjs` strips `-pooler`; `db:reset` and `db:adopt` use it.
- **Rule:** scripts that change the schema connect with `toDirectUrl(DIRECT_URL || DATABASE_URL)`.

### 2026-10-26 · repo · Agent shells may not delete files
- **Symptom:** `tar -x` over existing files fails with `Cannot open: File exists`; `rm` fails with `Operation not permitted`.
- **Cause:** the connected folder forbids deletes until the user grants it; tar unlinks before writing.
- **Fix:** write files in place (`cat src > dest`), and ask for delete permission once when files must go.
- **Rule:** when syncing files into the user's folder, overwrite in place; never assume delete works.

### 2026-10-26 · node-postgres · Naive timestamps read as local time
- **Symptom:** a row written through Kysely and read through Prisma 8 differed by the machine's UTC offset.
- **Cause:** `timestamp(3)` columns are UTC by convention; node-postgres parses and serialises them in local time.
- **Fix:** `src/lib/kysely.ts` pins both directions to UTC.
- **Rule:** any new `pg` connection reuses the same type parser settings (or goes through `@/lib/kysely`).
