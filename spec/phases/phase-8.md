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
- [ ] done

### 8.2 — Domain reconciliation job + `/platform/domains`
- **Goal:** `platform.domain.reconcile` — daily job diffs the Vercel
  provider's `listDomains()` against `Domain` rows → `DomainCheck` rows
  (added/removed/drifted); `/platform/domains` shows the latest report.
- **Files:** `src/platform/domains/reconcile.ts`, JOBS entry,
  `src/app/(platform)/platform/domains/page.tsx`, contract `DomainCheck`.
- **Done when:** a drift (Vercel has a domain the row doesn't, or vice
  versa) shows on the page within a day.
- [ ] done

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
- [ ] done

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
- [ ] done

### 8.5 — `/platform/usage` page
- **Goal:** usage counters, job throughput, error rate, queue depth — one
  page, rows not log lines.
- **Files:** `UsageCounter` writes where counters exist,
  `src/app/(platform)/platform/usage/page.tsx`.
- **Done when:** the page renders per-tenant usage + job metrics without
  scanning a table.
- [ ] done

### 8.6 — Load fixture + measurement
- **Goal:** `scripts/load/` — seed N tenants + published sites, autocannon
  at the target rate, record results (p95 TTFB, error rate, cache hit) in
  the brief's findings.
- **Files:** `scripts/load/seed.ts`, `scripts/load/run.sh`, brief findings.
- **Done when:** the staged run meets or records the spec/16 targets.
- [ ] done

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
