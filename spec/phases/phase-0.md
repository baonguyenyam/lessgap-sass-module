# Phase 0 — Foundation

**Status:** approved
**Roadmap:** [roadmap.md#phase-0--foundation](../roadmap.md)
**Read first:** [README](../README.md), [architecture](../01-architecture.md), [testing](../11-testing.md), [migrations-and-data](../12-migrations-and-data.md), [conventions](../13-conventions.md), [environments-and-release](../14-environments-and-release.md), [module-system](../15-module-system.md), [operations](../16-operations.md), ADR [0010](../adr/0010-modules-are-plugins-with-a-kernel.md), [0011](../adr/0011-independent-project-kit-as-reference.md), [0012](../adr/0012-temporal-for-dates-and-time-zones.md), [0017](../adr/0017-sentry-for-error-tracking.md), [0018](../adr/0018-cloudflare-r2-for-storage.md)

## Goal
Every guard rail later phases rely on exists and runs in CI: the test layers
with a real database, migration checks, the tenancy audit, the module kernel
skeleton with its scaffolder and boundary lint, the shared conventions
(errors, logging, money, time). No business feature yet; the product behaves
exactly as the kit does today.

## Out of scope
Tenants, memberships, plans, sites (phases 1–3). Any visible UI change.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 0-A | Accept ADRs 0002–0008 and 0010 as written? | accept / amend | **Accept**, 2026-10-27 |
| 0-B | Date-time library for `src/platform/time.ts` | Temporal polyfill / date-fns-tz | **Temporal polyfill** ([ADR 0012](../adr/0012-temporal-for-dates-and-time-zones.md)), 2026-10-26 |
| 0-C | Languages | — | **English (default) and Vietnamese**, everywhere; Italian removed (task 0.12), 2026-10-26 |
| 0-D | Relationship to the kit | mergeable fork / independent | **Independent project; kit is a reference** ([ADR 0011](../adr/0011-independent-project-kit-as-reference.md)), 2026-10-26 |

## Tasks

### 0.1 — CI on pnpm
- **Goal:** CI installs with the committed lockfile, type-checks, and builds with a migrated PostgreSQL service available for prerendered settings and plans.
- **Files:** `.github/workflows/ci.yml` (build database service and migration step), `package.json` (`packageManager`, `typecheck` script), `.gitignore` (`.env.example` tracked).
- **Tests:** none new.
- **Checks:** CI green on a PR.
- **Done when:** CI runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, lint, test, build, audit.
- [x] done (CI run 67 passed with an isolated migrated PostgreSQL service for build prerender)

### 0.2 — Local database and integration test layer
- **Goal:** `pnpm test:integration` runs against a real, migrated PostgreSQL locally and in CI.
- **Files:** `docker-compose.yml` (Postgres 17 with pgvector), `vitest.integration.config.mts`, `tests/integration/global-setup.ts` (refuses when `DATABASE_URL_TEST` points to the same database as `DATABASE_URL`; runs the Prisma 8 migration command against `DATABASE_URL_TEST`), `tests/integration/setup.ts` (sets `DATABASE_URL` to the test database for workers), `tests/helpers/db.ts` (`resetDatabase`), `tests/integration/db-smoke.test.ts`, `.env.example` (`DATABASE_URL_TEST`), `package.json` scripts `test:integration`, `db:up`, `db:down`, CI job with a `postgres` service.
- **Tests:** one smoke integration test that inserts and reads a kit `User`.
- **Checks:** `pnpm test:integration` locally and in CI.
- **Done when:** the CI integration job is green and fails if the test is broken on purpose.
- [x] done (local integration test and CI run 67 passed)

### 0.3 — Migration checks (M1, M2)
- **Goal:** CI proves migrations apply on an empty database and match the contract.
- **Files:** CI job `migrations` (Postgres service, `prisma db migrate`, `prisma db verify --strict`, seed), CI steps `contract emit` + stale check and `prisma migration check`, `src/lib/migration-manifest.test.ts` (a migration reaches the contract).
- **Tests:** M1, M2.
- **Checks:** change the contract without planning on a scratch branch → CI fails.
- **Done when:** the job runs on every PR.
- [x] done (prepared on 2026-10-26 with the move to Prisma 8; verify on the first PR)

### 0.4 — Ownership in the contract
- **Goal:** decide and apply how owners are separated in `prisma/contract.prisma`: commented sections per owner (default), or a Postgres namespace per module. Record it in an ADR.
- **Files:** `prisma/contract.prisma` (section headers), `migrations/app/refs/db.json` (current contract ref), ADR, `spec/12-migrations-and-data.md`.
- **Tests:** M2 (reordering sections must plan no migration).
- **Checks:** `pnpm db:emit`, `pnpm db:plan --name noop` reports nothing to plan, M1, M2.
- **Done when:** the ADR is accepted and the contract follows it.
- [x] done (accepted ADR 0024; section reorder leaves the contract and migration graph unchanged)

### 0.5 — Tenancy audit skeleton (T5)
- **Goal:** CI fails on any Prisma model that is not classified.
- **Files:** `src/platform/tenancy/models.ts` (classification list; kit models as `identity` or `global` with reasons), `scripts/audit-tenancy.mjs`, `tests/unit/scripts/audit-tenancy.test.mjs`, `package.json`, CI step.
- **Tests:** T5 (a fixture schema with an unclassified model fails).
- **Checks:** `pnpm audit:tenancy`.
- **Done when:** adding a model without classifying it breaks CI.
- [x] done (`pnpm audit:tenancy`, fixture test, typecheck and lint pass)

### 0.6 — Platform conventions: errors, action wrapper, logger, money, time
- **Goal:** the shared helpers in [conventions.md](../13-conventions.md) exist with tests.
- **Files:** `src/platform/errors.ts` (`AppError`, `ErrorCode`), `src/platform/action.ts` (`action()` wrapper → `ActionResult`), `src/platform/log.ts`, `src/platform/money.ts`, `src/platform/time.ts` (`@js-temporal/polyfill`, ADR 0012), `src/locales/en.json`, `src/locales/vi.json` (translated action errors), `vitest.config.mts` (coverage scope), tests in `tests/unit/platform/`.
- **Tests:** error-to-result mapping for every code; logger masks emails; money formatting in `en-US` and `vi-VN` and integer arithmetic; time conversions across DST in America/Chicago, America/New_York, America/Los_Angeles, and `Asia/Ho_Chi_Minh` (no DST), including a booking made from Vietnam for a Texas salon.
- **Checks:** `pnpm test`, coverage ≥ 90% on these files.
- **Done when:** helpers are exported and documented by comment; nothing uses them yet.
- [x] done (`pnpm test`, `pnpm typecheck`, `pnpm lint`; convention helpers have 100% line coverage)

### 0.7 — Module kernel skeleton
- **Goal:** `defineModule`, manifest schema, generated registry, `isModuleActive` stub (registered + platform switch only until phases 1–2).
- **Files:** `src/platform/modules/define.ts`, `src/platform/modules/manifest-schema.ts`, `src/platform/modules/runtime.ts`, `scripts/generate-module-registry.mjs`, `src/modules/registry.ts` (generated, empty), `src/modules/README.md` pointing to the spec, tests in `tests/unit/platform/modules/` and `tests/unit/scripts/generate-module-registry.test.mjs`.
- **Tests:** manifest schema accepts a valid manifest and rejects each invalid field; dependency graph with a cycle is rejected; registry generation is deterministic.
- **Checks:** `pnpm test`.
- **Done when:** an example manifest in a test fixture validates and loads.
- [x] done (`pnpm test` passed; registry generation is deterministic)

### 0.8 — Scaffolder and module checks
- **Goal:** `pnpm new:module <key>` and `pnpm modules:check`.
- **Files:** `scripts/new-module.mjs`, templates in `scripts/templates/module/`, `tests/contract/modules.test.ts`, `tests/unit/scripts/new-module.test.mjs`, `package.json` scripts, `vitest.config.mts` (include contract tests), `.agents/memory/lessons.md`, `spec/15-module-system.md` (align scaffolding with the shared Prisma contract).
- **Tests:** scaffold a module in a temp dir → contract tests pass on it; invalid key refused.
- **Checks:** `pnpm new:module demo_check` in a scratch branch → `pnpm modules:check` green → remove it.
- **Done when:** the scaffolder output matches the module shape in the spec exactly.
- [x] done (`pnpm new:module demo_check`, `pnpm modules:check`, scaffolded-module typecheck and full `pnpm test` passed)

### 0.9 — Boundary lint
- **Goal:** imports across module internals, from themes into services, and from the kernel into modules fail lint.
- **Files:** `eslint.config.mjs` (`no-restricted-imports` overrides per path), `tests/unit/eslint/module-boundaries.test.mjs` (fixture test), `.agents/memory/lessons.md`.
- **Tests:** fixture files that violate each rule produce lint errors.
- **Checks:** `pnpm lint`.
- **Done when:** the three boundaries in module-system.md are enforced.
- [x] done (`pnpm lint` and boundary fixture tests pass for all three import rules)

### 0.10 — Factories and test helpers
- **Goal:** `tests/factories/` with kit factories (`createUser`), the pattern that phase 1 extends with tenants.
- **Files:** `tests/factories/index.ts`, `tests/factories/user.ts`.
- **Tests:** factory produces a valid row in the integration database.
- **Checks:** `pnpm test:integration`.
- **Done when:** factories are used by the 0.2 smoke test.
- [ ] done

### 0.11 — Domains
- **Goal:** `lessgap.app` (apex, `www` → apex, `app`) and `*.lessgap.io` on the Vercel project.
- **Files:** `spec/14-environments-and-release.md` (record actual values), no code.
- **Tests:** none.
- **Checks:** `curl -I https://lessgap.app`, `curl -I https://test.lessgap.io` (wildcard certificate valid).
- **Done when:** both answer over HTTPS from the current deployment.
- [ ] done

### 0.12 — Vietnamese replaces Italian
- **Goal:** the product speaks English (default) and Vietnamese; nothing Italian remains.
- **Files:** `src/i18n/routing.ts` (locales `en`, `vi`; default `en`), `src/locales/vi.json` (every key of `en.json`, translated), delete `src/locales/it.json`, `docs/*.it.md` and `content/docs/*.it.md` replaced by `*.vi.md` (or removed where the guide is kit-only), `scripts/check-translations.mjs` (locale list), `AGENTS.md` rule "Every `docs/x.md` has a `docs/x.vi.md`", tests in `src/i18n/*.test.ts`.
- **Tests:** existing message tests pass for `en` and `vi`; routing test for `/vi/...`; language name for `vi` renders as "Tiếng Việt".
- **Checks:** `pnpm test`, `pnpm check:translations`, E2E accessibility on `/vi`.
- **Done when:** `/vi` serves the public pages in Vietnamese and `grep -r '\bit\b' src/i18n` finds no Italian locale.
- [ ] done

### 0.13 — Localise the private areas
- **Goal:** dashboard, platform console and auth pages render in the member's language (`en` or `vi`), chosen by a user preference with a switcher, without a locale segment in private URLs (the kit's proxy rule stays).
- **Files:** `src/i18n/request.ts` (locale from user preference, then `Accept-Language`, then `en`), `User.locale` field (migration `kit_user_locale`), language switcher in the account menu, `src/proxy.ts` untouched for prefixes.
- **Tests:** preference beats browser header; unknown locale falls back to `en`; emails to a member use their locale.
- **Checks:** `pnpm test`, `pnpm test:integration`, M1, M2.
- [ ] done

### 0.14 — Error tracking and request ids
- **Goal:** `log.error` writes an `ErrorReport` row and reports to Sentry; every request carries a request id ([operations](../16-operations.md), ADR 0017).
- **Files:** `src/proxy.ts` (stamp `x-request-id`, uuid v7), `src/platform/log.ts` (request-id context, `ErrorReport` writer), `src/platform/errors.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`, `instrumentation.ts` (`onError` hook), `prisma/contract.prisma` (`ErrorReport`), migration `platform_error_reports`, `.env.example` (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`), `/api/health` + `/api/health/live` routes.
- **Tests:** O4 (digest merge, masking, requestId, Sentry skipped when unconfigured); `beforeSend` scrub test; health returns 503 with a code when the DB is down.
- **Checks:** `pnpm test`, `pnpm test:integration`, M1, M2; set a scratch DSN and see an event arrive with tags, no user fields.
- **Done when:** a thrown error in a dev action produces one `ErrorReport` row carrying a `requestId` that the response also shows.
- [ ] done

### 0.15 — Job table and cron runner
- **Goal:** `Job` model, the runner route and the kind registry of [ADR 0008](../adr/0008-jobs-table-before-a-queue.md): due jobs claimed `FOR UPDATE SKIP LOCKED`, run with retries and backoff, landing `FAILED` with `lastError`.
- **Files:** `prisma/contract.prisma` (`Job`), migration `platform_jobs`, `src/platform/jobs/runner.ts`, `src/platform/jobs/registry.ts`, `src/app/api/cron/route.ts` (refuses without `CRON_SECRET`, accepts Vercel Cron and external pingers), `vercel.json` daily cron, docs for the external pinger in `spec/14`.
- **Tests:** O1, O2, O7; a handler that throws leaves the row retriable; an overdue locked job is reclaimed.
- **Checks:** `pnpm test`, `pnpm test:integration`, M1, M2; call the route twice concurrently in an integration test.
- **Done when:** a job enqueued for now runs on the next cron hit, and a second concurrent hit does not re-run it.
- [ ] done

### 0.16 — EmailMessage delivery record
- **Goal:** every `sendEmail()` call writes one `EmailMessage` row ([operations](../16-operations.md#email-outbox)); the provider outcome maps to `status`.
- **Files:** `prisma/contract.prisma` (`EmailMessage`), migration `platform_email_messages`, `src/lib/email-transport.ts`, `src/lib/email-delivery.ts`, retention prune job registered with 0.15's runner.
- **Tests:** O3; masked `lastError` keeps no address (reuses `maskAddresses`).
- **Checks:** `pnpm test`, `pnpm test:integration`, M1, M2.
- **Done when:** a refused send (bad key, suppressed address) still leaves exactly one row with `REFUSED` and a masked error.
- [ ] done

## Exit criteria
- CI green with jobs: install, typecheck, lint (with boundary rules), unit + contract, integration with Postgres, migration checks, tenancy audit, build, audit.
- `pnpm new:module` produces a module that passes `pnpm modules:check`.
- O1–O4 and O7 green in CI.
- Decisions 0-A…0-D recorded above.

## Findings
- **Resolved — Module schemas use the shared Prisma contract:** the scaffolding section in `spec/15-module-system.md` mentioned a per-module Prisma file, which conflicts with Prisma 8's single `prisma/contract.prisma` and accepted ADR 0024. The scaffolder creates the standard source shape; models are added to the owning section of the shared contract when a later task needs them.
- **Resolved 2026-10-27 — CI build needs a migrated database:** the first PR run exposed `CONTRACT.MARKER_READ_FAILED` while prerendering `/en/pricing` because the build job had no PostgreSQL service. Per owner approval, task 0.1 now provisions an isolated PostgreSQL service and applies Prisma 8 migrations before building; CI run 67 passes.
- **Resolved 2026-10-27 — Migration ref lagged the existing `Member.status` migration:** task 0.4's first plan proposed the same column again because `db` still pointed to the previous contract. Advanced `db` to the existing latest migration's `to` hash; `prisma migration check` and a repeat plan now pass with no changes.
