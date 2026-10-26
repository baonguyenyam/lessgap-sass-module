# Migrations and data

**Status:** `draft`

The database outlives every version of the code. A bad migration is the
hardest defect to undo, so the rules here are stricter than anywhere else.

## Schema layout

From phase 0 the schema is split into files, one per owner, using Prisma's
multi-file schema (`schema: "prisma/schema"` in `prisma.config.ts`):

```
prisma/schema/
  base.prisma          generator, datasource
  kit.prisma           models inherited from the kit (User, Account, Session, …)
  platform.prisma      Tenant, Member, Domain, Site, Plan, switches, overrides, usage, audit, jobs
  booking.prisma       one file per module that owns models
  shop.prisma
  …
```

A module owns the models in its file and nobody else edits them. Relations
across files are allowed only towards `platform.prisma` and `kit.prisma`
(every module model points at `Tenant`); a module never adds a relation to
another module's model. Cross-module references are plain id columns read
through the other module's `server/index.ts`.

## Naming

- Migration folder: Prisma's timestamp plus `<owner>_<change>`, e.g.
  `20261102140000_booking_add_appointments`. Owner is `kit`, `platform` or a module key.
- Tables and columns: Prisma model and field names, PascalCase models,
  camelCase fields, as the kit does. Enums PascalCase, values SCREAMING_SNAKE.
- Indexes and constraints named explicitly when written by hand in SQL:
  `<table>_<columns>_idx`, `<table>_<what>_excl`, `<table>_tenant_isolation` for RLS policies.

## Writing a migration

1. Edit the owner's `.prisma` file.
2. `pnpm prisma migrate dev --create-only --name <owner>_<change>`.
3. Open the generated SQL and add what Prisma cannot express, in the same file:
   RLS (`ENABLE` + `FORCE` + policy), exclusion constraints, partial indexes,
   `CREATE EXTENSION` (`vector`, `btree_gist`), check constraints.
4. `pnpm prisma migrate dev` to apply locally; run the tests.
5. Classify every new model in `src/platform/tenancy/models.ts`.
6. Commit schema, migration and classification together.

### RLS block every tenant-owned table gets

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
| `owner` (Neon default) | `prisma migrate deploy`, platform-wide maintenance scripts | bypasses (table owner) |
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
- Run `prisma migrate reset` or `db push` against anything but your own local database.
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

## Review checklist for any PR touching `prisma/`

- [ ] One owner per migration; name follows `<owner>_<change>`.
- [ ] Works with the previous deploy's code (expand/contract respected).
- [ ] New tenant-owned tables: `tenantId`, composite index, per-tenant uniques, RLS block, classification.
- [ ] Large-table indexes `CONCURRENTLY`, in their own migration.
- [ ] Backfill script and run order described, if any.
- [ ] `pnpm test:integration` green, including M1–M4.
