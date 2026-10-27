# Lessons

Read before every task. Format and rules: [README.md](./README.md). Newest first.

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
