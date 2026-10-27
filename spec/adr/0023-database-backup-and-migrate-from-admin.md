# 0023. Back up and migrate the database from the admin panel

**Status:** accepted (requested by the product owner, 2026-10-27)
**Date:** 2026-10-27

## Context
The owner wants two tools at `/admin` (ROOT only): back up the database and
apply pending migrations. Nothing else: no restore, no per-tenant snapshot, no
schedule yet. Answers given on 2026-10-27:

- Backups are written to R2 under `platform-backups/` (as
  [16-operations](../16-operations.md#backup-and-restore) names the prefix)
  and downloaded through a short-lived signed link.
- No restore in the admin panel: a backup is restored from a terminal, by the
  procedure in this ADR.
- Migrations may be applied from the panel in every environment, production
  included, behind safeguards.
- Backups are manual for now; a nightly schedule comes after a restore has
  been rehearsed once.

How comparable tools do it (their logic, not their code): WordPress backup
plugins, Laravel and Filament backup panels and Django's backup commands all
run the dump as a server task, write a compressed file to a storage disk, list
the files with date and size, and download them through the storage. CMS
"apply database updates" screens (Craft, Magento, WordPress core) list the
pending changes, apply them in order under a lock, and tell the user to back
up first; the careful ones take the backup themselves.

Constraints in this repository:

- The app runs on Vercel functions ([ADR 0004](./0004-vercel-for-subdomains-and-custom-domains.md)):
  no `pg_dump` binary, no Prisma CLI at runtime, a time limit per request.
- Prisma 8 ships a control client (`createPostgresControlClient` from
  `@prisma/orm-postgres/control`) whose `migrate()` applies the migration
  packages on disk (`migrations/app/*/ops.json`) to the contract compiled into
  the build. Tried against the development database on 2026-10-27, with plain
  Node: it reports "Already up to date" and changes nothing.
- Schema changes go through the direct host, not Neon's pooler (lessons).

## Decision

### Backup
- **Format: data only, plain SQL, gzipped** (`.sql.gz`). The schema is not
  dumped: it is the migration history, versioned in the repository. The file
  opens with a header naming the app version and the contract hash the
  database was at, then one `COPY "table" (columns) FROM stdin;` block per
  table in the `public` schema, ordered so that every table comes after the
  tables its foreign keys point to, then the sequence positions.
- **One consistent snapshot**: every table is read inside one
  `REPEATABLE READ READ ONLY` transaction, through a server-side cursor in
  batches, with values in Postgres's own text form (no parsing, nothing lost).
- **Storage**: `platform-backups/<UTC timestamp>.sql.gz` in the R2 bucket, with
  the contract hash, the app version and who started it as object metadata.
  The list on the page is the bucket listing; no new table. Downloads are
  presigned GET URLs valid for five minutes.
- **R2 client**: `aws4fetch` (MIT, about 6 kB, signs S3 requests for `fetch`),
  behind `src/platform/storage/`, the one module that talks to the bucket
  ([ADR 0018](./0018-cloudflare-r2-for-storage.md) left the client open).
- **Limits of v1**: the gzipped file is built in memory and uploaded in one
  request, and the request has the page's time limit (300 s). That covers the
  kit and early platform sizes; past them, the dump moves to the jobs table
  ([ADR 0008](./0008-jobs-table-before-a-queue.md)) and a multipart upload.

### Restore (from a terminal, not the panel)
1. Create an empty database (a Neon branch, or a local one).
2. Check out the commit whose contract hash matches the backup header, and
   run `pnpm db:migrate` against the empty database.
3. `gunzip -c backup.sql.gz | psql "$DIRECT_URL" -v ON_ERROR_STOP=1`.
4. Point the app at it once `pnpm check:deploy` passes.

### Migrate
- The page shows whether the database is at the build's contract and, if not,
  the pending migrations by name (from the manifest compiled into the build).
- **Apply** runs the control client's `migrate()` on the direct connection,
  after:
  1. a typed confirmation (the user types `MIGRATE`);
  2. a Postgres advisory lock taken for the whole run, so two clicks or two
     admins cannot run it twice; a second attempt is refused, not queued;
  3. a backup taken first. In production a failed or impossible backup (no R2
     configured) stops the run. Outside production, without R2, the run goes
     ahead with a warning, so the panel works on a fresh clone.
- The result (applied migration names, or the error code) is shown on the page
  and written to the server log. The migration folder ships with the
  function (`outputFileTracingIncludes` for `/admin/database`).

### Access
ROOT only, checked in the page and again in every server action
([ADR 0014](./0014-root-role.md)). Nothing here is reachable by tenant
admins.

## Consequences
- A ROOT user can take a backup and bring a database up to date without a
  terminal.
- The backup is only as useful as the restore: the procedure above must be
  rehearsed once before the nightly schedule is added.
- Migrations can now reach production from two places, deploy scripts and the
  panel. The lock and the marker make the second one a no-op when the first
  already ran, but the team must know which one it uses.
- The function bundle for `/admin/database` grows by the migration folder
  (about 2 MB) and the Prisma control plane.
- Spec 16 "Backup and restore" gains the manual, in-app layer; the nightly
  GitHub Action stays the plan for scheduled backups.

## Options considered
- **`pg_dump` from a GitHub Action, triggered by the panel.** The most
  faithful dump, but it needs a GitHub token in the app and an Action round
  trip for a button press. Kept for the nightly schedule.
- **Dump schema and data from the app.** Rebuilding DDL by hand duplicates what
  the migrations already state and drifts from them.
- **Store backups in the database.** No R2 needed, but the backup would live
  in the thing it protects and inflate it.
- **`@aws-sdk/client-s3`.** Full-featured, but several megabytes for three
  calls (put, list, presign).
- **Migrate only from CI.** Safer by default, but not what the owner asked for;
  the safeguards above are the compromise.
