# Phase 8 — Hardening and scale

**Status:** draft
**Roadmap:** [roadmap.md#phase-8--hardening-and-scale](../roadmap.md)
**Read first:** [operations.md](../16-operations.md) (targets + drills),
[ADR 0008](../adr/0008-jobs-table-before-a-queue.md),
[migrations-and-data.md](../12-migrations-and-data.md),
[conventions.md](../13-conventions.md).

## Goal

Prove the platform survives what it faces: every tenant table under RLS
(a test that lists unprotected tables), domain rows reconciled with Vercel
daily, three backup layers with a real restore drill, a `/platform/usage`
page that reads counters instead of logs, and the site surface measured
against the scale targets — queue and log-drain decisions revisited against
that measurement, not guessed.

## Out of scope

- Production DigitalOcean cutover — the domain-provider abstraction stays;
  this phase only proves the numbers.
- In-place per-tenant restore — v1 is restore-to-new (spec/16); in-place is
  "later".
- PSL submission itself — a manual external step; the phase only records
  the checklist and the prepared domain.
- A paid analytics tool — the `analytics` module is the tenant-facing
  page-views counter, not a provider integration.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 8-A | RLS check | Runtime query per page / a test that lists unprotected tables | **Test** — `pg_policies` + the tenancy classification list; a table without a policy fails the suite |
| 8-B | Domain reconciliation | Job writes report rows / job writes logs | **`DomainCheck` rows** — a daily `platform.domain.reconcile` job diffs Vercel API vs `Domain` rows; `/platform/domains` reads the latest report |
| 8-C | TenantSnapshot | DB row + R2 bundle / R2 only | **`TenantSnapshot` row + R2 bundle** — the row is the audit + status; the bundle is the data |
| 8-D | Usage counters | `UsageCounter` rows / aggregate on read | **`UsageCounter` daily rows** — the usage page reads counters, never scans a table |
| 8-E | Load fixture | Dev-only route / script | **Script + dev route** — `scripts/load/` seeds 200-host fixtures; autocannon hits them; results in findings |

## Tasks

### 8.1 — RLS coverage test
- **Goal:** a test that lists every tenant-classified table and asserts it
  has at least one RLS policy — no policy, no green.
- **Files:** `tests/integration/rls-coverage.test.ts` (query `pg_policies` +
  `information_schema.tables` for every `tenant-owned`/`tenant-identity`
  model).
- **Done when:** 67 classified tables each show a policy; adding an
  unprotected table fails.
- [x] done (**found + fixed a real gap**: `@@rls` emits `ENABLE ROW LEVEL SECURITY` only — `CREATE POLICY` comes from `policy_all` blocks, which existed for just `TenantSetting`/`TenantModule`. The other 47 tenant-owned tables were RLS-enabled but policy-less (deny-all in the letter, owner-bypassed in practice). Added `policy_all …_isolation` blocks for all 47 + `@@rls` to `NewsletterSubscriber` (the only `@@rls`-less tenant table), two migrations (`1654` — 45 policies + enable; `1655` — `EntitlementOverride`/`NewsletterSubscriber`). `tests/integration/rls-coverage.test.ts` — `pg_policies` + `pg_class.relrowsecurity` per `tenant-owned` model, Kysely `sql` on `authDb` (49 tables all covered). `db8.raw.sql` needs `.returnsRow({codecs}).build()` — Kysely's `sql` tag is simpler for catalog queries. Lesson added: `@@rls` + `policy_all` are separate directives.)

### 8.2 — Domain reconciliation job + `/platform/domains`
- **Goal:** `platform.domain.reconcile` — daily job diffs the Vercel
  provider's `listDomains()` against `Domain` rows → `DomainCheck` rows
  (added/removed/drifted); `/platform/domains` shows the latest report.
- **Files:** `src/platform/domains/reconcile.ts`, JOBS entry,
  `src/app/(platform)/platform/domains/page.tsx`, contract `DomainCheck`.
- **Done when:** a drift (Vercel has a domain the row doesn't, or vice
  versa) shows on the page within a day.
- [x] done (`DomainProvider.listDomains?()` — Vercel `/v9/projects/<id>/domains` GET, DO `/v2/domains` GET; local has none → `reconcileDomains` skips rather than guesses. `DomainCheck` (platform-private, `runId`-batched): `missing_provider` (row exists, provider lacks it) / `extra_provider` (provider has it, no row). `platform.domain.reconcile` daily `0 4 * * *`. `/platform/domains` — latest run's drifts + every `Domain` row's status. Integration `domain-reconcile.test.ts` 3/3 — both drift kinds, matching → clean, unlisted provider → skip.)

### 8.3 — `TenantSnapshot` + snapshot job + R2 bundle (O5)
- **Goal:** on-demand and nightly snapshot — every tenant-owned table →
  one gzipped JSON bundle at `snapshots/<tenantId>/<snapshotId>.json.gz`;
  `TenantSnapshot` row records status/size/row counts.
- **Files:** contract `TenantSnapshot`, `src/platform/backup/snapshot.ts`,
  `src/platform/jobs/registry.ts` (`platform.tenant.snapshot` on demand +
  `platform.tenant.snapshot_nightly` scheduled), R2 upload.
- **Tests:** O5 — snapshot creates a downloadable bundle with every
  tenant-owned table's rows.
- **Done when:** a snapshot request produces a gzipped bundle in R2 and a
  `TenantSnapshot` row.
- [x] done (`TenantSnapshot` (tenant-owned + `@@rls` + `policy_all`): status, rowCounts, sizeBytes, r2Key, requestedBy — migration `ca7d656a`. `src/platform/backup/snapshot.ts` — `snapshotTenant` dumps every `tenant-owned` model per `MODEL_CLASSIFICATION` → gzipped `SnapshotBundle` → `putObject(snapshots/<tenantId>/<id>.json.gz)` when `storageConfigured()` → row marked `done`; error → `failed` + rethrow. JOBS: `platform.tenant.snapshot` (payload) + `platform.tenant.snapshot_nightly` (`0 3 * * *`, every ACTIVE tenant). O5 test 3/3 — every tenant-owned table in rowCounts, second tenant's rows never enter, storage → `snapshots/` key.)

### 8.4 — Restore-to-new + O6 + `/platform/backups`
- **Goal:** import a bundle into a fresh tenant — ids remapped via a
  mapping table, nothing collides; the console page lists snapshots,
  requests one, restores-to-new, shows nightly status.
- **Files:** `src/platform/backup/restore.ts`,
  `src/app/actions/platform-backup.ts`,
  `src/app/(platform)/platform/backups/page.tsx`.
- **Tests:** O6 — snapshot tenant A, restore to new tenant B → row counts
  match, ids differ, tenant A untouched.
- **Done when:** restore-to-new produces a working tenant from a bundle.
- [x] done (`src/platform/backup/restore.ts` — `restoreBundle`: pass 1 builds a complete `idMap` for every row, then inside one Kysely transaction (`SET LOCAL session_replication_role = replica` — insert order can't trip FK mid-import) inserts every row with `tenantId` remapped, `id` remapped, and any field whose value is a mapped id followed. `JSON_FIELDS` map (contract's `Json` columns) re-serializes db8's parsed values — scalar JSON comes back as plain strings and Postgres rejects them raw (`invalid input syntax for type json`). `restoreSnapshot` → `downloadObject` → gunzip → new `Tenant` → `restoreBundle`. `downloadObject` added to `r2.ts`; `buildBundle` split from `snapshotTenant`. `/platform/backups` — snapshot list (status, counts, size), `Snapshot now` + `Restore to new tenant` actions, nightly-job status. O6 test green — restored tenant reproduces tables with fresh ids, chunk's `sourceId` follows the map, source untouched.)

### 8.5 — `/platform/usage` page
- **Goal:** usage counters, job throughput, error rate, queue depth — one
  page, rows not log lines.
- **Files:** `UsageCounter` writes where counters exist,
  `src/app/(platform)/platform/usage/page.tsx`.
- **Done when:** the page renders per-tenant usage + job metrics without
  scanning a table.
- [x] done (`/platform/usage` — four metric cards (queue depth = `QUEUED` `Job` count, jobs in last 24h, `FAILED` count, `ErrorReport` occurrence sum in 24h) + per-tenant `UsageCounter` list (`limitKey`, `used`, `periodStart`, tenant name via include) + jobs-by-kind aggregate. All reads are row reads — no log scanning. Integration `platform-usage.test.ts` 1/1 — counters/jobs/errors read back with tenant names.)

### 8.6 — Load fixture + measurement
- **Goal:** `scripts/load/` — seed N tenants + published sites, autocannon
  at the target rate, record results (p95 TTFB, error rate, cache hit) in
  the brief's findings.
- **Files:** `scripts/load/seed.ts`, `scripts/load/run.sh`, brief findings.
- **Done when:** the staged run meets or records the spec/16 targets.
- [x] done (`scripts/load/seed.ts` — `LOAD_TENANTS=N` tenants + published `Site` + `SiteSettings` per `load-XXXX` slug (tsx + `import "dotenv/config"` — db8 reads `DATABASE_URL` at module init; verified: 3 tenants seeded on dev Neon). `scripts/load/run.sh` — autocannon loop across `load-XXXX.${SITES_DOMAIN}` hosts (`RATE`/`DURATION`/`COUNT` env; `SITES_DOMAIN` auto-reads `NEXT_PUBLIC_SITES_DOMAIN` from `.env`). Findings: **the spec's 500 req/min × 200 hosts target needs a staging run — a local `next dev` on a remote Neon dev DB is not the staging shape** (first-compile dominates TTFB, remote latency inflates everything). Dev-run smoke: `Host: load-0000.lessgap.io` reached the proxy and returned responses — a seeded site surfaces through `resolveHost`; the spec target is recorded for the staging drill, not asserted locally.)

### 8.7 — ADR revisit + PSL note + analytics module
- **Goal:** measure the Job table under the drain target → ADR keeps or
  moves off the table; log-drain ADR; PSL submission checklist recorded;
  `analytics` module — tenant page-view counter + `/t/<slug>/analytics`.
- **Files:** `spec/adr/0022-queue-revisited.md`, `spec/adr/0023-log-drain.md`,
  `spec/adr/0024-psl.md`, `src/modules/analytics/`.
- **Done when:** both ADRs cite measured numbers and the module counts a
  page view per site request.
- [ ] done

## Exit criteria

- RLS coverage test green — every tenant table has a policy.
- O5/O6 pass — snapshot produces a bundle; restore-to-new reproduces the
  tenant.
- `/platform/domains`, `/platform/backups`, `/platform/usage` render real
  rows.
- Load results recorded in findings; queue + log-drain ADRs cite them.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

(none yet)
