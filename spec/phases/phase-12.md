# Phase 12 — gift cards, memberships and packages

The roadmap's "Later" list's sellable items: a tenant sells a gift card (a
balance someone pays up front and spends later), a membership (a recurring
perk — e.g. "member hours") and a package (a bundle of prepaid sessions — e.g.
"5 massages"). They're booking-adjacent: the buyer pays once and the credit
lands against later appointments.

**Read:** spec/07-booking.md, spec/15-module-system.md,
spec/12-migrations-and-data.md, `src/app/actions/booking.ts`,
`src/app/actions/orders.ts`, `src/platform/payments/connect.ts`,
`src/platform/modules/registry.ts`.

## Scope

- Phase 12: done.

## Tasks

### 12.1 `GiftCard` + `Purchase` extension — buy a card, hold a balance

`GiftCard` — tenant-owned, a code, `balanceCents`, `soldVia` (`Purchase`),
`active`. A `purchase.kind: "giftcard"` buys one through the same checkout;
a card's balance is debited when it's spent against an appointment (the
booking's `orderId` stays `null` — the card pays, not Stripe). A
`GiftCardLedger` row per change so the balance is auditable.

**Tests:** integration — a card debits when spent; a spent-down card stops;
the ledger's balance matches the card's.
**Done when:** buy → card → spend → ledger hold together.
- [x] done (`tests/integration/gift-cards.test.ts` 1/1 — `buyGiftCard` sells a card at the till, `redeemGiftCard` debits against a `completed` appointment (the ledger's running sum is the balance's twin; one debit per appointment; a spent-down card refuses); `Review`'s missing `policy_all` was caught and added in the same migration.)

### 12.2 Memberships and packages — a prepaid entitlements bundle

`Package` — tenant-owned, a name, a `sessions` count and a `priceCents`; a
customer buys one and spends sessions against appointments, the same
ledger-on-the-balance pattern as the gift card. `Membership` — a name and
monthly `priceCents`; a member gets the tenant's member perks (e.g. member
hours). A `PackageLedger`/`MembershipLedger` row per change.

**Tests:** integration — a package debits sessions when spent; an empty
package stops; membership activates and bills monthly.
**Done when:** package spends + membership activates correctly.
- [x] done (`tests/integration/packages-memberships.test.ts` 2/2 — `buyPackage` holds `sessionsLeft` against the package's sessions, `spendPackage` debits one per appointment (empty refuses); `activateMembership` joins and `billMembership` charges the month's `priceCents` — ledgers are the twin of each holding's state.)

### 12.3 In-place restore — a snapshot can come back to the same tenant

`restoreBundle` only builds a new tenant (task 8.4); a tenant who wants
"put it back how it was" has no path. `restoreInPlace` clears the tenant's
own rows and re-inserts the snapshot's — the same bundle, same table
order, the tenant's own `idMap` (the snapshot's tenantId is kept; its
other ids are preserved). Audited on the platform console.

**Tests:** integration — snapshot → mutate → restore-in-place → the
pre-snapshot state returns.
**Done when:** the restore lands on the same tenant.
- [x] done (`tests/integration/restore-in-place.test.ts` 1/1 — `restoreInPlace` clears the tenant's rows and re-inserts the bundle's with their original ids (`restoreBundle`'s remap stays for restore-to-new); `/platform/backups` gets a "Restore in place" button (`restoreInPlaceAction`, audited).)

### 12.4 The manage page asks for the review

`submitReview` exists; the visitor can't reach it — a `completed`
appointment's manage page now asks, the token proving the visit.

**Tests:** e2e — a completed appointment's manage page shows the form; a
submitted review lands `pending`.
**Done when:** the form renders and submits.
- [x] done (`src/components/booking/review-form.tsx` — the manage page's `completed` appointment offers a rating + note → `submitReview`; an existing review's status shows instead.)

### 12.5 The dashboard sells the cards, packages and memberships

12.1's and 12.2's actions exist but the till can't reach them — a
`/t/<slug>/sales` page sells a `GiftCard`, sells a `Package` onto a
customer, activates a `Membership`, and lists the holdings.

**Tests:** integration — the page's actions land the rows; e2e — sell a
card and see it listed.
**Done when:** the sell + list paths work end-to-end.
- [x] done (`/t/<slug>/sales` — `SalesActions` sells a card (amount + buyer email → `buyGiftCard`), a package onto a customer (`buyPackage`) and activates a membership (`activateMembership`); cards + holdings list alongside.)

## Exit criteria

- The card buys, spends and balances correctly; tests green.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
