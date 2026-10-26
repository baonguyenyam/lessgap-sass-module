# Migrations and data

**Status:** `draft`

The database outlives every version of the code. A bad migration is the
hardest defect to undo, so the rules here are stricter than anywhere else.

## Schema layout

One contract, `prisma/contract.prisma` (Prisma 8 reads a single contract
source). Ownership is by section: the file is ordered kit models, then
platform models, then one section per module, each opened by a comment
`// ── <owner> ──` naming the owner. A module owns the models in its section and
nobody else edits them. Relations across sections are allowed only towards
platform and kit models (every module model points at `Tenant`); a module never
adds a relation to another module's model. Cross-module references are plain id
columns read through the other module's `server/index.ts`. Whether modules
should instead get a Postgres namespace each (`namespace booking { … }`) is
decided in phase 0, task 0.4.

## Naming

- Migration folder: Prisma's timestamp plus `<owner>_<change>`, e.g.
  `20261102T1400_booking_add_appointments` (the slug passed to `pnpm db:plan --name`). Owner is `kit`, `platform` or a module key.
- Tables and columns: Prisma model and field names, PascalCase models,
  camelCase fields, as the kit does. Enums PascalCase, values SCREAMING_SNAKE.
- Indexes and constraints named explicitly when written by hand in SQL:
  `<table>_<columns>_idx`, `<table>_<what>_excl`, `<table>_tenant_isolation` for RLS policies.

## Writing a migration (Prisma ORM 8)

The project runs Prisma 8 only. The `prisma-8` skill (`.claude/skills/prisma-8/`)
is the reference for every command below; read it before the first change.

1. Edit `prisma/contract.prisma` (the owner's section).
2. `pnpm db:emit` regenerates `generated/prisma8/`.
3. Check the `db` ref points at the newest migration's `to` hash
   (`pnpm prisma migration list`, `pnpm prisma migration ref set db <hash>`).
4. `pnpm db:plan --name <owner>_<change>`. Read the output: the `from:` line
   must name the previous contract, never `(baseline)` over existing migrations.
5. Review `migrations/app/<dir>/migration.ts`. Replace every `placeholder(...)`
   with a `this.dataTransform(...)` built on the end contract; add what the
   contract cannot declare with `rawSql(...)`. Self-emit:
   `node migrations/app/<dir>/migration.ts`.
6. Advance the ref to the new migration: `pnpm prisma migration ref set db <to-hash>`.
7. `pnpm db:migrate` locally; run the tests. `pnpm prisma migration check` must pass.
8. Classify every new model in `src/platform/tenancy/models.ts` (from phase 0).
9. Commit the contract, `generated/prisma8/`, the migration package, its
   snapshot under `migrations/snapshots/` and the ref together.

### The baseline and databases built by Prisma 7

`migrations/app/*_kit_baseline` describes exactly the schema the kit's Prisma 7
migrations produced (verified in strict mode against a database built from
them). Every later migration chains from it.

- A new, empty database: `pnpm db:migrate` applies the baseline and everything after it.
- A database Prisma 7 built (it has `_prisma_migrations`): run `pnpm db:adopt`
  once. It signs the database at the baseline (Prisma verifies the schema first
  and refuses a mismatch), applies the migrations after it, verifies, and with
  `--drop-legacy-table` removes `_prisma_migrations`.
- `pnpm check:deploy` tells which of the three a database is.

### RLS every tenant-owned table gets

Declared in the contract (`@@rls` and a policy block per operation, see the
`prisma-8` skill, `contract.md`), so the planner writes it into the migration
and `db verify` checks it. The resulting SQL is equivalent to:

```sql
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Appointment_tenant_isolation" ON "Appointment"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
```

Test M3 fails when a tenant-owned table lacks it.

## Database roles

| Role | Used by | RLS |
| --- | --- | --- |
| `owner` (Neon default) | `prisma db migrate`, platform-wide maintenance scripts | bypasses (table owner) |
| `app` | the running application through `tenantDb` | enforced; no `BYPASSRLS` |
| `platform` | `src/platform/` reads across tenants (console, jobs) | `BYPASSRLS`, used only through a dedicated client in `src/platform/db.ts` |

Connection strings: `DATABASE_URL` (app role, pooled), `DATABASE_URL_PLATFORM`
(platform role, pooled), `DATABASE_URL_MIGRATE` (owner, direct). Introduced
in phase 1; until then the kit's single `DATABASE_URL` keeps working.

## Changes that must not break a running deploy

Vercel serves the old code while the new deploy builds, and both talk to the
same database. Every migration must work with the code before it and after it.
Breaking changes use **expand, migrate, contract** over at least two deploys:

| Change | Deploy 1 (expand) | Deploy 2 (contract) |
| --- | --- | --- |
| Rename a column | add new column, write both, backfill | read new, drop old |
| Make a column required | add as nullable, backfill, write always | `SET NOT NULL` |
| Change a type | add new column of new type, dual-write, backfill | switch reads, drop old |
| Drop a table or column | stop reading and writing it | drop it |
| Add a unique constraint | dedupe with a backfill, then add `CONCURRENTLY` (separate migration, see below) | — |

Forbidden in a single step: dropping or renaming a column or table that the
deployed code reads, adding `NOT NULL` without a default to a table with rows,
long locks on large tables.

Indexes on tables expected to be large (`Appointment`, `Order`,
`KnowledgeChunk`, `AuditLog`, `NotificationLog`) are created `CONCURRENTLY`,
each in its own migration file (Postgres cannot run it inside a transaction).

## Never

- Edit or delete a migration that has been merged to `main`. Fix forward.
- Reset or push a schema against anything but a development database.
  `pnpm db:reset` is the only reset command, and it refuses production and
  any remote host not listed in `DB_RESET_ALLOW_HOSTS`.
- Put data fixes inside a schema migration when they touch many rows; use a backfill.
- Store secrets, personal data or tenant content in a migration or seed.

## Backfills

One-off data changes live in `scripts/backfills/<YYYYMMDD>-<owner>-<what>.ts`:

- Idempotent: running twice changes nothing the second time (test M4).
- Batched (default 500 rows), resumable from where it stopped, with progress logs.
- Dry-run by default; `--apply` to write.
- Runs with the platform role and builds a `system` TenantContext per tenant
  when it calls module services.
- Recorded in the PR description with the command to run and its order
  relative to the deploy.

## Seeds

| Seed | Command | Contains | Where |
| --- | --- | --- | --- |
| System | `pnpm db:seed` | plans, add-ons, platform switches, feature catalogue sync, platform owner from env | every environment, idempotent upserts |
| Demo | `pnpm db:seed:demo` | one demo tenant per vertical with services, staff, appointments, products; demo members | local and preview only; refuses to run when `NODE_ENV=production` |

Seed code reuses factories from `tests/factories/` so seeds and tests build
the same valid shapes.

## Starting over

`pnpm db:reset` rebuilds a development database from nothing; `pnpm
db:reset:demo` adds the demo seed; `--yes` skips the confirmation for scripts.
Prisma ORM 8 has no `migrate reset`, so `scripts/db-reset.mjs` does it:

1. Refuses unless the target is safe (`scripts/db-reset-guard.mjs`, tested):
   never when `NODE_ENV` or `VERCEL_ENV` is `production`; local hosts are
   allowed; a remote host only if its name or Neon endpoint id is in
   `DB_RESET_ALLOW_HOSTS` (set in `.env.local`, never in a shared env).
2. Prints the database and host and asks you to type the database name.
3. Drops `public` and Prisma's bookkeeping schemas (other schemas are left
   alone), recreates `public`.
4. Builds the schema: `prisma db migrate` when on-disk migrations exist,
   otherwise `prisma db init` from the contract.
5. Runs the system seed, then the demo seed with `--demo`.

Seeds must therefore stay idempotent and must succeed on an empty database.

## Review checklist for any PR touching `prisma/`

- [ ] One owner per migration; name follows `<owner>_<change>`.
- [ ] Works with the previous deploy's code (expand/contract respected).
- [ ] New tenant-owned tables: `tenantId`, composite index, per-tenant uniques, RLS block, classification.
- [ ] Large-table indexes `CONCURRENTLY`, in their own migration.
- [ ] Backfill script and run order described, if any.
- [ ] `pnpm test:integration` green, including M1–M4.
