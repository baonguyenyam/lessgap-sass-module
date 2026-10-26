# Testing standard

**Status:** `draft`

Tests are how an agent proves a change works, and how the next agent learns
what "works" means. A change without the tests this document asks for is not
finished, whatever the diff looks like.

## Layers

| Layer | Tool | Where | Database | Runs |
| --- | --- | --- | --- | --- |
| Unit | Vitest | beside the file: `foo.ts` → `foo.test.ts` | none | `pnpm test`, every CI run |
| Integration | Vitest, separate config | `tests/integration/<area>/*.test.ts` | real PostgreSQL, migrated, emptied per test file | `pnpm test:integration`, every CI run |
| Contract | Vitest | `tests/contract/*.test.ts` | none | `pnpm test`, every CI run |
| End-to-end | Playwright | `e2e/<area>/*.spec.ts` | real PostgreSQL with seed | `pnpm test:e2e`, CI on `main` and on PRs touching UI or flows |
| Accessibility | Playwright + axe | `e2e/accessibility*.spec.ts` | seed | with E2E |
| Migration | script | `scripts/check-migrations.mjs` | throwaway PostgreSQL | every CI run that touches `prisma/` |

- **Unit** tests cover pure functions: prices, fees, availability, limits,
  entitlement resolution, host parsing, slug rules, schema parsing. No
  network, no database, no real clock.
- **Integration** tests cover what only a database can prove: tenant
  isolation, RLS, unique and exclusion constraints, transactions,
  `consumeLimit` under concurrency, webhook handlers end to end with signed
  payloads. Never mock Prisma in an integration test.
- **Contract** tests check structure that every module must satisfy (see
  [module-system.md](./15-module-system.md)): every registered module's
  manifest parses, its features are declared, its routes are gated, its
  models are classified.
- **E2E** tests cover a user's path across pages and hosts: signup and
  onboarding, a site served on a subdomain, booking, checkout in Stripe test
  mode, impersonation banner.

## The pyramid we aim for

Many unit tests, a solid integration suite around every tenant-owned model
and every money or time calculation, and few E2E tests, one per critical path.
An E2E test that checks a rule a unit test could check is in the wrong layer.

## Test database

- Local: `docker compose up -d db` (PostgreSQL with pgvector, added in phase
  0) or a personal Neon branch. `DATABASE_URL_TEST` points at it; the
  integration config refuses to run if it equals `DATABASE_URL`.
- CI: a `postgres` service container with the pgvector image.
- Each integration test file runs `migrate deploy` once (global setup) and
  truncates tenant tables between tests through `resetDatabase()`.
- Tests that check RLS connect as the application role, not as the owner
  role, because owners bypass RLS.

## Fixtures and factories

- Factories live in `tests/factories/` and build valid rows with the least
  input: `createTenant({ plan: "starter" })`, `createMember(tenant, "manager")`,
  `createService(tenant, { durationMinutes: 30 })`. They return the row and
  the `TenantContext` to use with it.
- `withTwoTenants(async ({ a, b }) => { ... })` creates two tenants with the
  same shape of data. Every isolation test is written with it.
- No shared mutable fixtures between tests. No reliance on seed data in
  integration tests; seed data is for E2E and local development.
- Times are fixed: inject a clock (`now: () => Date`) into code that needs one,
  or use `vi.useFakeTimers()` in unit tests. Never `new Date()` in an assertion.

## Naming and shape

- File names mirror what they test. `describe` names the unit, `it` states
  the behaviour as a sentence: `it("refuses a booking that starts inside another staff appointment")`.
- Arrange, act, assert, in that order, with a blank line between.
- One behaviour per `it`. Table-driven tests (`it.each`) for rule matrices.
- A bug fix starts with a failing test named after the bug's behaviour.

## Coverage

Coverage is a smoke alarm, not a target. Floors enforced in CI from phase 1:

| Scope | Lines |
| --- | --- |
| `src/platform/**/lib`, `src/modules/*/lib` (pure logic) | 90% |
| `src/lib` (kit) | as today, not lowered |

Services and routes are covered by integration and E2E tests, not by a number.

## Flaky tests

A test that fails without a code change is a defect. Quarantine it with
`it.skip` and a linked issue in the same day, fix within the phase, never
retry-until-green in CI.

## Mandatory test-case catalogue

Every row below must exist as a test by the end of the phase that builds the
area. Phase briefs copy the rows they own into their task lists.

### Tenancy (phase 1)
| # | Case | Layer |
|---|---|---|
| T1 | Every module service called with tenant A's context returns none of tenant B's rows | integration |
| T2 | Update or delete by id of a B row with A's context affects 0 rows and returns not-found | integration |
| T3 | Raw query with `app.tenant_id` = A as the app role returns no B rows (RLS) | integration |
| T4 | `tenantDb` throws on a tenant-owned model queried without scope | unit |
| T5 | A model without classification fails the tenancy audit | unit (script) |
| T6 | Member of A requesting `/t/<b-slug>` gets 404 | E2E |
| T7 | Removed member loses access on the next request | integration |
| T8 | Impersonation requires a reason, shows a banner, writes audit rows, expires after 60 minutes | integration + E2E |
| T9 | Tenant deletion leaves no row with its id in any tenant-owned table | integration |
| T10 | Platform staff without `platformRole` cannot open `/platform` | E2E |

### Entitlements (phase 2)
| # | Case | Layer |
|---|---|---|
| E1 | Resolver: switch off beats plan on | unit |
| E2 | Resolver: override with `ignoresSwitch` beats switch off | unit |
| E3 | Resolver: expired override is ignored | unit |
| E4 | Resolver: `requires` chain turns dependants off | unit |
| E5 | Resolver: add-on raises a limit; `null` stays unlimited | unit |
| E6 | `consumeLimit`: 20 concurrent calls with 5 remaining → exactly 5 succeed | integration |
| E7 | Period rollover starts a new counter | unit |
| E8 | Downgrade hides a module on site and dashboard, keeps its data | E2E |
| E9 | Every feature key used in code is declared | contract |
| E10 | Server action of a gated feature refuses when the feature is off, even with a crafted request | integration |

### Domains and sites (phase 3)
| # | Case | Layer |
|---|---|---|
| D1 | Host resolution for every row of the table in domains.md, including ports, upper case, trailing dot | unit |
| D2 | Reserved slugs and invalid slugs refused | unit |
| D3 | A domain claimed by tenant A cannot be added by B | integration |
| D4 | Non-primary hostnames redirect 308 to the primary | E2E |
| D5 | Direct request to `/sites/...` on the app host is refused | E2E |
| D6 | Suspended tenant: site shows maintenance and `noindex` | E2E |
| D7 | Saving business hours revalidates the site within 10 s | E2E |
| D8 | Every shared theme renders its fixture with zero axe violations | E2E |
| D9 | Theme with an unknown key falls back to the vertical default and logs | unit |

### Booking (phase 5)
| # | Case | Layer |
|---|---|---|
| B1 | Slots respect weekly hours, time off, existing appointments, buffers | unit |
| B2 | DST spring-forward and fall-back days in America/Chicago and America/New_York | unit |
| B3 | "Any staff" offers a slot when at least one qualified staff member is free | unit |
| B4 | Minimum notice and maximum advance windows | unit |
| B5 | Last slot of the day ends at or before closing | unit |
| B6 | Two concurrent bookings of one slot → exactly one succeeds (exclusion constraint) | integration |
| B7 | Canceled appointment frees its slot | integration |
| B8 | Booking over `booking.monthly` limit is refused with an upgrade message | integration |
| B9 | Reminder job sends once, at the configured offsets, never to opted-out SMS numbers | integration |
| B10 | Book → confirm email → reschedule via manage link | E2E |

### Payments (phase 6)
| # | Case | Layer |
|---|---|---|
| P1 | `computeApplicationFee` for every model, zero, rounding, cap, fee never above amount | unit |
| P2 | Proportional fee refund | unit |
| P3 | Connect webhook: signature required, idempotent on replay, maps to the right tenant | integration |
| P4 | Checkout refused while `chargesEnabled` is false | integration |
| P5 | Shop checkout in Stripe test mode with the plan's fee | E2E |

### Chatbot (phase 7)
| # | Case | Layer |
|---|---|---|
| C1 | Retrieval never returns another tenant's chunk with identical text | integration |
| C2 | Price answers come from tools; changing a price changes the answer without re-index | integration (stubbed model) |
| C3 | Injection text in a document does not change the tool policy | integration (stubbed model) |
| C4 | Message over the monthly limit is refused politely | integration |

### Migrations (every phase)
| # | Case | Layer |
|---|---|---|
| M1 | `migrate deploy` on an empty database succeeds | CI script |
| M2 | Schema and migrations are in step (`prisma migrate diff` shows no drift) | CI script |
| M3 | Every tenant-owned table has RLS enabled and a policy | integration |
| M4 | Backfill scripts are idempotent: running twice changes nothing the second time | integration |
