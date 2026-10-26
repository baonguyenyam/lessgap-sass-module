# Lessons

Read before every task. Format and rules: [README.md](./README.md). Newest first.

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
