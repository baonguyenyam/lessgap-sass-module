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

- Phase 12: in progress.

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
- [ ] done

## Exit criteria

- The card buys, spends and balances correctly; tests green.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
