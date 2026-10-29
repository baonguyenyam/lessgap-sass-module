# Phase 10 — spec/11 close-out: the last E2E rows

The phase-9 suite closed the deferred host/module/revalidation/booking/order
checks. What remains in the spec/11 table are the rows that never fit an
earlier phase's brief: the theme accessibility bar, the platform 2FA gate,
and the parts of the module-disable check E8 didn't reach.

**Read:** spec/11-testing.md (the E2E table — D8, L2, O8), spec/06-platform.md
(the platform console's security posture), `src/themes/`, `tests/e2e/`.

## Scope

- Phase 10: done.

## Tasks

### 10.1 D8 — every shared theme renders its fixture, zero axe violations

`accessibility.spec.ts` covers the app pages; the site themes have no axe
pass. Render each registered theme's published fixture site on a host and
scan it. `classic` and `main` must each come back with zero serious-or-
critical violations.

**Tests:** extend `tests/e2e/` — one axe scan per registered theme.
**Done when:** every theme in `src/themes/registry.ts` is scanned and clean.
- [x] done (`tests/e2e/themes.spec.ts` 1/1 — `themeFixtures` in `src/themes/fixtures.ts` + `/themes/[theme]` renders each theme's `fixtureSite` (the route sits outside `[locale]`, so `/themes` joined `UNLOCALIZED` in the proxy); `classic` and `main` scan clean.)

### 10.2 O8 — staff without 2FA is refused `/platform` until it's on

The platform console gates on `platformRole` only today (T10). Spec/11's O8
requires a second factor too: a staff member without `twoFactorEnabled` is
refused `/platform` — pointed at the 2FA setup — until it is on. Implement the
gate in the platform layout, then E2E it.

**Tests:** `tests/e2e/` — staff without 2FA can't open `/platform`; with it,
they can.
**Done when:** the gate exists and the spec passes.
- [x] done (`tests/e2e/platform-2fa.spec.ts` 1/1 — `requirePlatformRole` reads `twoFactorEnabled` and redirects staff without it to `/dashboard/account/security`. The gate's first target was `/2fa` — that's the sign-in challenge page, an AUTH route the proxy bounces a signed-in user away from; the setup surface is the account-security page.)

### 10.3 L2 — the module-disable checks E8 didn't reach

E8 proved nav + site + data. L2 also requires its module's routes 404 and its
jobs/subscribers pause. Assert: disabling `booking` 404s `/book` on the site
and leaves the tenant's `Appointment` rows; disabling `chatbot` pauses its
scheduled work (`platform.chatbot.reindex` no longer enqueues).

**Tests:** `tests/e2e/` — route 404 + job-pause assertions.
**Done when:** L2's full surface is covered.
- [x] done (`modules.spec.ts` L2 test — `requireModuleRoute` swapped onto all seven site pages (module-gated routes return 404, not the `module_inactive` 500 `requireModule` throws); `reindexTenant` returns `{sources: 0, chunks: 0}` once chatbot is off — the `isModuleActive` guard pauses the scheduled work.)

## Exit criteria

- The new specs are green; the full `tests/e2e` suite stays green.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
