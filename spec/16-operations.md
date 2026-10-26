# Operations, observability and scale

**Status:** `draft`

How we run the platform: see errors before customers do, keep queues and
email visible, survive losing a database, and grow from free tiers to paid
services without rewrites. The rule for everything on this page: **start on a
free tier, hide it behind one boundary, and name the load at which we pay.**
A provider never leaks past its wrapper, so the upgrade is a config change
and a price, not a project.

## The cost ladder

Free now, paid when we have the customers to pay for it. The trigger is the
load at which we revisit the choice and write an ADR; the boundary column is
the one place the provider can be reached from, which is what keeps the swap
cheap.

| Concern | Now (free tier) | Boundary | Pay when | Then |
| --- | --- | --- | --- | --- |
| Error tracking | Sentry (5k errors/mo), `ErrorReport` table always | `src/platform/log.ts`, `instrumentation*.ts` | sustained Sentry quota use | paid Sentry, or self-hosted GlitchTip ([ADR 0017](./adr/0017-sentry-for-error-tracking.md)) |
| Structured logs | `log` → Vercel function logs + `ErrorReport` for errors | `src/platform/log.ts` | we need >1 day retention or search | Vercel log drain to Better Stack or Axiom |
| Background work | `Job` table + cron route, external free pinger | `src/platform/jobs/`, module `jobs.ts` | minute granularity is not enough, or runs outgrow a function invocation | Trigger.dev or QStash ([ADR 0008](./adr/0008-jobs-table-before-a-queue.md)) |
| Transactional email | Brevo free (300/day) | `sendEmail()` | >300/day sustained, or deliverability | Amazon SES, third `sendEmail` branch ([ADR 0009](./adr/0009-brevo-for-email-ses-later.md)) |
| Email observability | `EmailMessage` row per send | `sendEmail()` | — | kept whichever provider sends |
| Rate limiting | in-memory → Upstash Redis REST when env is set | `src/lib/rate-limit.ts` | free Upstash quota, or more shared state | paid Upstash; same REST shape |
| Media and files | Cloudflare R2 (10 GB free, zero egress) | `src/platform/storage/` | it grows: R2 stays, the bill just scales | R2; exports and snapshots share the bucket ([ADR 0018](./adr/0018-cloudflare-r2-for-storage.md)) |
| Database | Neon free branch per env | `db8`, `authDb`, `DATABASE_URL`/`DIRECT_URL` | storage, PITR window, branches | Neon paid tier; read replicas later |
| Uptime | Better Stack or UptimeRobot free monitor on `/api/health` | the health route | customers ask for a status page | paid monitor + public status page |
| Analytics | Vercel Analytics free allowance | existing kit wiring | allowance | paid Vercel Analytics |
| Realtime | none | — | a feature needs it (live dashboard, chat) | Pusher or Ably; decision then |
| Push notifications | none | — | a mobile or PWA need appears | FCM, free at our volume |
| LLM | smallest model that passes the chatbot tests | module `chatbot` internals | quality or volume | ADR per provider ([chatbot-rag](./08-chatbot-rag.md)) |

A service not in this table and not in the architecture table is a decision
that needs an ADR before code.

## Errors and request tracing

Goal: when the system is big, any error answers *what, where, which tenant,
which request* without reproducing it first.

- **Request id.** The proxy stamps `x-request-id` (uuid v7) on every request
  that lacks one and carries it in log context; route handlers, actions and
  jobs include it in every `log.*` call ([conventions](./13-conventions.md)).
  Job runs store the request id of the run, not of the enqueue.
- **Two sinks, one call.** `log.error` writes an `ErrorReport` row *and*
  reports to Sentry when `SENTRY_DSN` is set. The table powers the console
  page and works with Sentry off (local, preview); Sentry gives alerting,
  grouping and source maps in production. Neither is optional for `log.error`:
  a writer that forgets one sink is a bug.
- **`ErrorReport`** groups by `digest` (hash of surface + error name + first
  stack frame), keeps `count`, `firstSeenAt`, `lastSeenAt`, `requestId`,
  `tenantId` when scoped, `source` (`marketing`, `dashboard`, `platform`,
  `site`, `api`, `cron`, `job`), and a masked message — the same masking rule
  as the logger: no addresses, names or secrets. Retention 30 days, pruned by
  a daily job. `resolvedAt` lets staff close a group; a recurrence clears it.
- **Sentry setup** ([ADR 0017](./adr/0017-sentry-for-error-tracking.md)):
  `sentry.server.config.ts`, `sentry.edge.config.ts`,
  `instrumentation-client.ts`; `beforeSend` drops events whose scrub fails and
  strips `request`, `user` and cookies — we send the digest fields, never the
  person. `tags.tenantId` and `tags.requestId`, not user ids. Source maps
  upload in CI when `SENTRY_AUTH_TOKEN` is set; without it the build is still
  green.
- **Health endpoints.** `/api/health` (DB + migration head + build version)
  for the uptime monitor; `/api/health/live` (process up) for load checks.
  Neither exposes internals: a failed check is a 503 with a code, not a
  stack.
- **Alerting.** Phase 0: Sentry email alerts on new issue groups. Phase 8:
  alert rules reviewed — error rate, job failures, queue depth, cron silence
  (a cron that did not check in is itself an alert).

## Logs

- One logger, structured, event names `<area>.<what>` — as
  [conventions](./13-conventions.md) already states. This doc adds where the
  lines go: Vercel function logs in every environment, a log drain to a paid
  store when retention matters (see ladder).
- What is *not* in function logs and never will be: personal data, secrets,
  full payloads. Anything a person must query later is a row — `AuditLog`,
  `EmailMessage`, `ErrorReport`, `UsageCounter` — not a log line.
- The platform console reads the rows, not the log stream. See the pages
  list below.

## Background work and queues

[ADR 0008](./adr/0008-jobs-table-before-a-queue.md): a `Job` table, one cron
route that claims due rows `FOR UPDATE SKIP LOCKED`, handlers idempotent
with retries and backoff, kinds registered in each module's `jobs.ts`.

What this doc adds:

- **Triggering.** Vercel Cron on the Hobby tier runs at most once a day,
  which cannot drive reminders or purges. The cron route therefore accepts
  any caller holding `CRON_SECRET`: Vercel Cron daily as the floor, plus a
  free external pinger (cron-job.org or a GitHub Actions schedule) every
  minute in production. Both hit the same route; the table, not the trigger,
  holds the state.
- **Contention.** Claims use `FOR UPDATE SKIP LOCKED` inside a transaction —
  two concurrent cron invocations never run the same row (test O1). A run
  past its lock is retried by the next claim; a handler that outlives the
  function leaves the row `QUEUED` with `attempts + 1`.
- **Dead jobs.** After `maxAttempts` the job stays `FAILED` with `lastError`;
  the console shows it and a retry button resets it. Job failures also write
  `ErrorReport` with `source: "job"`.
- **Long work** is split into chained jobs rather than run past the function
  limit; a job that needs a worker is the trigger for [ADR 0008](./adr/0008-jobs-table-before-a-queue.md)'s queue move.
- **Schedules.** Recurring work (reminders, domain checks, reconciliation,
  retention prunes) is declared in module `jobs.ts` with its cron expression;
  the runner materialises the next `Job` row after each run. Nothing
  schedules by writing rows ad hoc.

## Email outbox

Every `sendEmail()` call writes one `EmailMessage` row — `kind`, `toAddress`,
`subject`, `provider`, `status` (`QUEUED | SENT | REFUSED | FAILED`),
provider message id, masked `lastError`, `tenantId` when known. This is the
delivery record the tenant can ask about; it is also the retry source when a
provider blips. The existing `deliver()` masking rule stands: the row keeps
the real recipient, the *log line* never does. Retention 1 year
([security-compliance](./10-security-compliance.md#data-retention)).

Queueing: v1 sends inline inside `sendEmail` and records the outcome; the
`EmailMessage` row exists either way. Phase 5 can flip high-volume kinds
(reminders, marketing) to `QUEUED` rows drained by a job, without touching
callers — same table, new status path.

## Caching and shared state

- **Now.** Next.js per-region cache for site pages keyed by host, revalidated
  by tag on save ([architecture](./01-architecture.md#caching)); entitlements
  cached per tenant; host→tenant resolution cached. Rate limiting already
  upgrades itself to Upstash REST when its two env vars are set
  (`src/lib/rate-limit.ts`) — the same pattern (feature off → shared store
  behind env) is the template for every later shared-state need.
- **The rule that keeps this load-balance safe:** no correctness ever depends
  on in-process state. Caches may be stale for seconds; the database is the
  authority. Anything mutated is either a row or a tag invalidation.
- **Later.** When invalidation across regions or arbitrary key-value state is
  needed (sessions already live in the DB, so this is real work, not
  sessions): Upstash Redis, paid tier, behind `src/platform/cache.ts`. Write
  that file when the second consumer arrives, not before.

## Media and file storage

Cloudflare R2, S3-compatible, tenant-prefixed keys
([ADR 0018](./adr/0018-cloudflare-r2-for-storage.md)). The kit already
declares `R2_*` env vars; `src/platform/storage/` is the only importer of the
S3 client. Keys:

```
media/<tenantId>/<fileId>.<ext>
exports/<tenantId>/<exportId>.zip
snapshots/<tenantId>/<snapshotId>.json.gz
platform-backups/<yyyy-mm-dd>.sql.gz
```

Downloads go through signed URLs with short TTLs; tenant files are never
public-bucket objects. The zero-egress property is what makes per-tenant
snapshots and downloads affordable at scale.

## Backup and restore

Three layers, each tested differently. "Backup" that is never restored is a
hope, not a backup — every layer has a drill.

| Layer | What | Mechanism | Where it lands | Tested by |
| --- | --- | --- | --- | --- |
| Database | whole platform | Neon PITR within the plan's window + nightly `pg_dump` by a scheduled GitHub Action | `platform-backups/` in R2, 30-day lifecycle | restore drill, phase 8 |
| Tenant | one tenant's rows | `TenantSnapshot` job: every tenant-owned table per the classification list → one gzipped JSON bundle | `snapshots/<tenantId>/` in R2 | O5, O6 |
| Member/module | a person's or module's data | kit account export (exists); `ModuleExport` per module (phase 2, test L9) | `exports/` in R2 | L9 |

- **Per-tenant restore v1 is restore-to-new:** the bundle is imported into a
  freshly created tenant, old ids remapped by a mapping table written during
  import, so nothing collides and the original tenant is untouched. In-place
  restore (same tenant, roll back in time) is a later decision — it needs
  ordering and conflict rules per module.
- **Snapshot cadence.** On demand from the console (staff, or owner via
  Settings) in v1; a nightly job per active tenant once the snapshot format
  has survived a few drills. Bundles expire after 30 days by bucket
  lifecycle.
- **Restore drill** (phase 8, scheduled twice a year after that): pick a
  staging tenant, snapshot, delete, restore-to-new, compare row counts per
  table. Platform-level: PITR a Neon branch, verify, discard.
- **RPO/RTO targets to design against:** database RPO = PITR window
  (minutes) plus nightly floor of 24 h; tenant RPO = last snapshot (on
  demand, then daily); RTO for a single tenant = under an hour (one job);
  for the platform = redeploy + PITR/restore, same day.

## Contention and load-balance readiness

The app is stateless, so balancing the web tier is the platform's job, not
ours. What we must not break under concurrency:

- **Instances share nothing in memory.** Sessions are rows; rate limits move
  to Upstash when env-set; caches are rebuildable. Killing any instance loses
  no work in flight — jobs are claimed rows, not held state.
- **Database contention rules** (also in [conventions](./13-conventions.md)):
  uniqueness is a constraint, not a check-then-insert; counters use upsert
  (`INSERT … ON CONFLICT`), never read-modify-write outside a transaction;
  job claims are `SKIP LOCKED`; booking slots get an exclusion constraint
  (phase 5, B6); webhooks and public posts carry idempotency keys; settings
  saves compare `updatedAt` for optimistic concurrency.
- **Connections.** App traffic uses Neon's pooled host; schema and seed
  scripts use the direct host (already enforced by `toDirectUrl`).
  Transactions stay short — no `await` on network or user time inside one.
- **Bottleneck order**, so we scale the right thing first: Postgres
  connections and query time → then job throughput → then email throughput →
  then storage. The web tier is last because it scales itself.

## Scale targets

Numbers the phase-8 load test must demonstrate, on the staging shape:

- 1,000 tenants provisioned, each with a published site.
- Site surface: 500 req/min sustained across 200 distinct hosts, p95 TTFB
  < 500 ms cached, error rate < 0.1%, cache hit rate measured and recorded.
- Dashboard: 50 concurrent members across 50 tenants, no cross-tenant row in
  any response (the isolation suite, under load).
- Jobs: 1,000 due jobs drain in under 2 minutes with two concurrent runners;
  no double-run (O1).
- Email: 500 `QUEUED`→`SENT` transitions in a run without duplicating a send.
- Tools: autocannon or k6 against staging, plus a dev-only seed/load fixture
  (the shape platform.madelab.io uses). Results go in the phase-8 brief's
  Findings.

## The ops pages

Everything above is operable from the platform console. A page exists for
each thing a human watches; nothing operational is read-only-through-psql.

| Page | Shows / does | Phase |
| --- | --- | --- |
| `/platform/tenants` | list, detail, create, suspend, reactivate, impersonate | 1 |
| `/platform/audit` | `AuditLog` search by actor, tenant, action | 1 |
| `/platform/jobs` | due/running/failed jobs, retry, run-now, per-kind silence | 1 |
| `/platform/emails` | `EmailMessage` search by tenant, kind, status; payload preview, resend | 1 |
| `/platform/errors` | `ErrorReport` groups by digest, occurrences, resolve, link to Sentry issue when known | 1 |
| `/platform/switches`, `/platform/plans`, `/platform/overrides` | configuration | 2 |
| `/platform/modules` | per-tenant module state, purge/export status | 2 |
| `/platform/emails/templates` | template list, per-locale preview, send-test (templates stay code — same argument as themes, ADR 0005) | 5 |
| `/platform/domains` | domain rows vs Vercel reconciliation report | 8 |
| `/platform/backups` | `TenantSnapshot` list per tenant, request snapshot, restore-to-new, nightly-dump status | 8 |
| `/platform/usage` | usage counters, job throughput, error rate, queue depth | 8 |

Member-facing twins, tenant-scoped under `/t/[slug]/settings`: security (2FA,
sessions — kit has it under user settings), activity (`AuditLog` filtered to
their tenant), backup/export, modules (phase 2). The kit's Settings →
Backup/Logs/Security pages already exist for accounts and move under the
tenant settings shell in phase 1's layout.

## What the reference projects taught us

Feature-level notes from the three sibling projects; their code is a
different stack generation (Auth.js, Prisma 7) and is not ported.

- **platform.madelab.io** — the shape to aim at for the console: a
  `platform/` area (tenants, plans, email-logs, email-templates, backup,
  database, reports, integrations) next to a `system/` area (cron, logs,
  usage). Sentry for errors, Trigger.dev/QStash for jobs at volume,
  autocannon load tests behind dev-only routes, split health endpoints,
  passkeys, a maintenance page. Our jobs-table-first choice stands until its
  limits show ([ADR 0008](./adr/0008-jobs-table-before-a-queue.md)).
- **vnbca.org** — the member-ops pages: admin backup screen, email-logs
  screen, roles/permissions UI, maintenance mode, media library on
  S3-compatible storage, cron reminder endpoint, a dedicated 2FA verify page,
  FCM push notifications.
- **bellav-2026** — what a mature admin surface grows into: email-logs,
  backup, reports, migration tooling, and a full AI admin (knowledge
  sources, training sets, quality review, chat logs). Phase 7's chatbot
  console should read this list before its brief is written.
- **Deliberately not copied:** their RBAC matrices (our role set is smaller
  by design), rich-text editors (no tenant need yet), realtime (no feature
  consumes it yet).

## Still to decide

- Passkeys for members and staff — likely phase 8 or "later"; Better Auth
  has a plugin; the reference stack uses WebAuthn.
- In-place per-tenant restore (vs restore-to-new).
- Public status page.
- Log drain provider (when retention forces it).
- SMS provider is Twilio per the architecture table; quiet hours and consent
  live in [security-compliance](./10-security-compliance.md).
