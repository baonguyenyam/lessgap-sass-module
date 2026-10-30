# Phase 14 — the gaps phases 11–13 surfaced

The pieces landed in phases 11–13 work; a few paths never closed — a
waitlist entry the customer books from stays `notified` forever (nobody
marks it `booked`), a `redeemGiftCard`/`spendPackage` exists but no form
offers it, and the new surfaces' e2e coverage is thinner than the
integration.

**Read:** `src/app/actions/booking.ts`, `src/app/actions/gift-cards.ts`,
`src/app/actions/packages-memberships.ts`, `tests/e2e/booking.spec.ts`.

## Scope

- Phase 14: in progress.

## Tasks

### 14.1 The waitlist's booked transition

`notifyWaitlist` marks `waiting → notified`; nothing marks `booked`.
`bookAppointment` — when the customer books, find the waitlist entry
(same tenant, same email, `wantedDate` = the booked day, status
`waiting` or `notified`) and mark it `booked`.

**Tests:** integration — a waitlist entry the customer books from becomes
`booked`.
**Done when:** the transition lands.
- [ ] done

### 14.2 The booking form can pay with a card or a package

`redeemGiftCard`/`spendPackage` exist; the booking form has no field for
them. A completed-appointment flow offers "pay with a gift card code" and
"spend a package session" — the card code debits, the package debits a
session.

**Tests:** integration — the booking path can carry a card code / a
package spend.
**Done when:** the payment path works end-to-end.
- [ ] done

### 14.3 E2E for the new surfaces

The sales page (`/t/<slug>/sales`), the manage-page review form, and
`/status` — each one renders its data end-to-end.

**Tests:** e2e — the three surfaces render.
**Done when:** the specs are green.
- [ ] done

## Exit criteria

- The waitlist transition lands, the booking path can pay, the surfaces render.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration`, the e2e specs green.

## Findings
