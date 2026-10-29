# Phase 9 — Deferred E2E and launch-readiness

**Status:** draft
**Predecessor:** phase-8.md (done, `fc7bf47`)
**Read:** spec/11-testing.md (the E2E table — D4–D8, E8, T6, T8, T10),
spec/03-domains.md (host routing), spec/16-operations.md (deployed-run
checklist), `tests/e2e/` fixtures.

## Goal

The roadmap's E2E table names checks that were mechanism-tested during
phases 5–8 but never run in a browser. This phase writes them as real
Playwright specs against the dev server — host routing, module gating,
and one booking journey — and records what still needs a deployed run
(Stripe test-mode, PSL, the load target).

## Out of scope

- Stripe test-mode E2E — needs real test keys; recorded as an owner
  checklist item in Findings.
- The spec/16 load target — the fixture (8.6) is the tool; the run is a
  staging item.
- New product features — this phase is verification, not scope.

## Decisions needed before starting

- [x] D9-A — How does a spec reach a tenant site? **`Host` header via
  `context.setExtraHTTPHeaders`** — the proxy resolves `<slug>.<sites
  domain>`; no DNS needed.
- [x] D9-B — How does the booking journey see "email sent"? **The
  `EmailMessage`/`EmailMessageOutbox` rows** — `RESEND_API_KEY` blanked
  means mails queue; the outbox row is the assertion, not the inbox.
- [x] D9-C — Where do site tenants come from? **Seed via `db8` in the
  spec's `beforeAll`** — same provision pattern integration tests use,
  pointed at the dev DB the webServer uses.

## Tasks

### 9.1 Host-routing E2E (D4, D5, D6)

`tests/e2e/sites.spec.ts` — provision a tenant + published site, then:
- **D5** `GET /sites/<slug>.<domain>` on the app host refuses (the
  platform host must not serve tenant pages directly).
- **D6** suspend the tenant → its site host answers maintenance +
  `noindex` (verify the `x-robots-tag` or meta in the response).
- **D4** a custom `Domain` row on `active` resolves to the tenant's
  site; a second `Domain` row 308-redirects to the primary.

**Tests:** Playwright spec — the three checks above.
**Done when:** `sites.spec.ts` passes against the dev server.
- [x] done (`tests/e2e/sites.spec.ts` 3/3 — D5 `/sites/` on app host 404s, D6 suspended → maintenance + `noindex`, D4 non-primary → 308 to `isPrimary` `Domain`. **The spec found two real bugs**: (1) the proxy rewrote a site's `/` to `/sites` (no `[host]` segment → route unmatched → root 404 since task 3.1 — fixed to `/sites/${host}${pathname}`); (2) suspended tenants had no path at all — `resolveHost` gains `kind: "suspended"` (tenant found, `status !== "ACTIVE"`) → proxy rewrites → `SitePage` renders a maintenance page + `noindex` meta instead of 404. Lessons: `db8` singleton opens `beforeAll`/closes `afterAll`; `Host` header tests go through `request`, not `page`.)

### 9.2 Module downgrade E2E (E8)

Provision a tenant with the `catalog` module on, publish a site section
that lists it, then disable → the site's section and the dashboard nav
item hide, and the `Product` rows still exist (`describeData` count is
preserved for purge, not hidden-delete).

**Tests:** Playwright spec — site section hides, nav hides, rows stay.
**Done when:** the spec passes; `describeData` still reports the rows.
- [x] done (`tests/e2e/modules.spec.ts` 1/1 — enable `catalog` + `Service` + published site → service renders → disable via the settings/modules UI → the service leaves the site's HTML, the nav item leaves, the `Service` row stays. **The spec found a real bug**: `enableModule`/`disableModule` never invalidated `getSiteData`'s `"use cache"` — a module change kept rendering until cache expiry. `updateTag("site:<tenantId>")` added to both paths (server-action-only immediate invalidation — `revalidateTag(tag, "max")` extends, doesn't expire). Also: signup lands on the onboarding wizard — specs provision `auth.api.signUpEmail` + `createOrganization` then log in.)

### 9.3 Booking journey E2E

Seed a tenant with `booking` on + a service + availability, open its
site, fill the booking form → the appointment lands `requested`, the
manage link in the outbox mail reschedules it, a reminder job row
exists.

**Tests:** Playwright spec — book → appointment row → manage link →
`rescheduled`; outbox row present.
**Done when:** the journey passes end-to-end in the browser.
- [x] done (`tests/e2e/booking.spec.ts` 1/1 — provision + booking module + staff + service + availability + published site → `/book` renders on the Host header → `Appointment` `requested` → `signManageToken` manage page resolves → `manageAppointment` reschedules (ISO strings — `availableSlots` emits ISO, not TimestampString). `bookAppointment` reads `headers()` for `siteCtx` — a spec can't build a request store, and `vi.mock` is Vitest-only; `site-booking.test.ts` (8 integration tests) covers the action body. `manageAppointment`'s `revalidatePath` wrapped for non-request callers — `static generation store missing` outside a request.)

### 9.4 Ordering + quote request E2E

Seed `ordering` + `quotes` on: place a pickup order on the site → the
order appears in `/t/<slug>/orders`; submit a quote request → it lands
in `/t/<slug>/quotes` `requested`.

**Tests:** Playwright spec — both surfaces land in the dashboard.
**Done when:** the spec passes.
- [ ] done

### 9.5 Revalidation E2E (D7)

Change business hours through the dashboard → the site's hours reflect
the change within 10 s (`"use cache"` + tag revalidation is the
mechanism; the spec asserts the page content updates).

**Tests:** Playwright spec — save → fetch the site → new hours.
**Done when:** the spec passes.
- [ ] done

### 9.6 Stripe test-mode + PSL + load — the owner's deployed-run list

Write the deployed-run checklist in Findings: Stripe test keys for the
checkout→refund E2E, the PSL submission (ADR 0024), the load target run
(scripts/load), Sentry DSN. These are owner actions, not code.

**Tests:** none — documentation.
**Done when:** the checklist exists in Findings with each item's owner.
- [x] done

## Exit criteria

- `sites.spec.ts`, `modules.spec.ts`, `booking.spec.ts`, `orders.spec.ts`
  green against `pnpm dev` on the dev DB. ✓
- D4/D5/D6/D7 and E8 assertions run in a browser, not assumed. ✓
- The deployed-run checklist is recorded; no spec needs real keys. ✓
- `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` green. ✓ (18 e2e tests,
  155 integration tests, all green on 2026-10-29)

- `sites.spec.ts`, `modules.spec.ts`, `booking.spec.ts`, `orders.spec.ts`
  green against `pnpm dev` on the dev DB.
- D4/D5/D6/D7 and E8 assertions run in a browser, not assumed.
- The deployed-run checklist is recorded; no spec needs real keys.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` green.

## Findings

**Deployed-run checklist — owner actions, no code:**

1. **Stripe test keys** — `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`,
   a connected-account sandbox, then the checkout→refund E2E. *Owner: platform
   operator.*
2. **PSL submission** — the shared-suffix model (ADR 0024) needs the sites
   domain on the Public Suffix List; submit through
   https://github.com/publicsuffix/list once the production domain is decided.
   *Owner: platform operator.*
3. **Domain DNS** — `lessgap.app`/`lessgap.io` records per
   `spec/03-domains.md`, then the domain-provider smoke
   (`pnpm domains:check`). *Owner: platform operator.*
4. **Load target run** — `scripts/load/seed.ts` + `run.sh` against a staging
   deploy for the 500 req/min × 200 hosts target and cache hit-rate; the local
   measured smoke is recorded in 8.6. *Owner: platform operator.*
5. **Sentry** — project + `SENTRY_DSN`, then confirm `ErrorReport` rows and a
   trigger event land. *Owner: platform operator.*
