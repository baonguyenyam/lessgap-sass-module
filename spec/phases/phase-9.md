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
- [ ] done

### 9.2 Module downgrade E2E (E8)

Provision a tenant with the `catalog` module on, publish a site section
that lists it, then disable → the site's section and the dashboard nav
item hide, and the `Product` rows still exist (`describeData` count is
preserved for purge, not hidden-delete).

**Tests:** Playwright spec — site section hides, nav hides, rows stay.
**Done when:** the spec passes; `describeData` still reports the rows.
- [ ] done

### 9.3 Booking journey E2E

Seed a tenant with `booking` on + a service + availability, open its
site, fill the booking form → the appointment lands `requested`, the
manage link in the outbox mail reschedules it, a reminder job row
exists.

**Tests:** Playwright spec — book → appointment row → manage link →
`rescheduled`; outbox row present.
**Done when:** the journey passes end-to-end in the browser.
- [ ] done

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
- [ ] done

## Exit criteria

- `sites.spec.ts`, `modules.spec.ts`, `booking.spec.ts`, `orders.spec.ts`
  green against `pnpm dev` on the dev DB.
- D4/D5/D6/D7 and E8 assertions run in a browser, not assumed.
- The deployed-run checklist is recorded; no spec needs real keys.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e` green.

## Findings
