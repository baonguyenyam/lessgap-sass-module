# Phase 6 — Payments, shop, ordering, quotes

**Status:** done
**Roadmap:** [roadmap.md#phase-6--payments-shop-ordering-quotes](../roadmap.md)
**Read first:** [billing.md](../05-billing.md) ("Tenant payments"),
[modules.md](../07-modules.md) (`payments`, `shop`, `ordering`, `quotes`),
[ADR 0006](../adr/0006-stripe-connect-for-tenant-payments.md),
[module-system.md](../15-module-system.md), [conventions](../13-conventions.md).

## Goal

A tenant takes real money. The owner connects a Stripe account through
Stripe-hosted onboarding (ADR 0006 — the tenant is merchant of record; we
never see bank details), charges run on the connected account with an
application fee from `computeApplicationFee(model, amount, context)` — a
pure function with a test per model. Until `chargesEnabled` flips true,
every paid feature on the site (deposits, shop checkout, paying a quote)
is hidden, not broken. `payments` is the only module that talks to Stripe —
others ask it for a checkout; refunds return the fee proportionally; a
payouts view lists money in and out. On top of it: `shop` (products → cart
→ checkout → pickup or shipping), `ordering` (menu items with modifiers +
pickup slots + kitchen capacity), `quotes` (schema-driven request → priced
quote → link → accept with optional deposit → convert to order or
appointment), and booking deposits (`booking.deposits` wired at last).

## Out of scope

- Platform's own subscription billing — phase 2 did that; this phase is
  only money the TENANT collects.
- Stripe Tax auto-calculation — the flag and hook exist; enabling per
  tenant is a later polish.
- Gift card redemption flow — `Product.type` includes it; the sell/redeem
  UI is later.
- In-person/POS payments, Square/Clover — ADR 0006 leaves them to a later
  integration.
- Multi-item quote→appointment scheduling — conversion produces an order
  or a single appointment.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 6-A | Connected-account state | Columns on `Tenant` / own `ConnectedAccount` model | **Columns on `Tenant`** (`stripeAccountId`, `chargesEnabled`, `payoutsEnabled`, `onboardingStatus`) — one account per tenant per ADR 0006; no second lifecycle |
| 6-B | Checkout mechanism | PaymentIntent / Checkout Session | **Checkout Session** — Stripe-hosted, no card fields on our site, application_fee_amount supported |
| 6-C | Fee config resolution | Plan key + `EntitlementOverride` / new table | **`Plan.paymentFeeModel` + `Plan.paymentFeeBps/fixed/cap` + `EntitlementOverride`** — the existing five-layer resolver decides |
| 6-D | Cart identity | `Cart` row by cookie / sessionStorage | **`Cart` row keyed by cookie (`cart_id`), attached to `Customer` on checkout** per spec/07 |
| 6-E | Quote→deposit | Reuse appointment deposit / own checkout | **Own checkout session on the quote** — a `Payment` row links `quoteId`, same fee path |

## Tasks

### 6.1 — `computeApplicationFee` engine
- **Goal:** the one pure function every charge consults.
- **Files:** `src/lib/billing/fee.ts`, `src/platform/entitlements/registry.ts`
  (fee model/bps/fixed/cap feature keys), `tests/unit/lib/fee.test.ts`.
- **Tests:** every model (`none`, `percent`, `fixed`, `percent_fixed`,
  `per_booking` → metered flag not amount, `percent_capped`), rounding
  (integer cents, half-up), zero amount, cap, fee never negative/exceeding
  charge, `refundFee` proportional on partial refunds.
- **Checks:** `pnpm test`, `pnpm typecheck`.
- **Done when:** fee math is unit-tested per spec/05's table.
- [x] done (`src/lib/billing/fee.ts` — `computeApplicationFee(model, amount)`: `none` 0, `percent` bps/10000 round-half-up, `fixed` constant, `percent_fixed` both, `percent_capped` min(pct,cap), `per_booking` meters (fee 0 + `metered: true` — it bills on the platform invoice, not the charge). Fee is clamped [0, amount]. `refundFee` returns the fee proportionally (round-half-up). `Plan.feeModel` JSON already held the config — no schema needed (decision 6-C simplified: plan JSON + TenantSetting override later). 9 unit tests — every model, rounding, zero, cap, refund.)

### 6.2 — Connect + Payment schema
- **Goal:** connected-account state on `Tenant`, `Payment` and `Refund`
  models, migration, classification.
- **Files:** `prisma/contract.prisma` (+Tenant columns, `Payment`, `Refund`),
  migration, `models.ts`, `delete-tenant.ts` + T9, `src/platform/tenancy/`.
- **Tests:** T9 extension — delete cleans Payment/Refund.
- **Checks:** `pnpm db:emit`, `pnpm audit:tenancy`, `pnpm test:integration`.
- **Done when:** migration applied, 51 models classified.
- [x] done (`Tenant` — `connectOnboardingStatus` + `payoutsEnabled` added (`stripeAccountId` + `chargesEnabled` already existed from phase 2's tenant billing — decision 6-A kept). `Payment` (tenantId, kind, `checkoutSessionId` unique = idempotency key, paymentIntentId, amountCents, feeCents, currency, status, optional customerId/appointmentId/orderId/quoteId links) and `Refund` (paymentId FK, amountCents, `feeRefundCents`, status) — `@@rls` cascade, 50 models classified, `deleteTenant` covers both, T9 green. Migration `20261029T1532_platform_payments` → `8b160a22`.)

### 6.3 — `payments` module: onboarding, webhook, chargesEnabled gate
- **Goal:** Connect onboarding link (Settings → Payments), Connect webhook
  (`/api/webhooks/connect`, signed, idempotent, mapped by account id),
  `createCheckout(ctx, …)` the other modules call, paid-feature gate.
- **Files:** `src/modules/payments/module.ts`, `src/platform/payments/*`,
  `src/app/actions/payments.ts`, `src/app/api/webhooks/connect/route.ts`,
  `/t/<slug>/settings/payments`, nav, translations, `module.payments` seed.
- **Tests:** integration — webhook signed with Stripe SDK, idempotent on
  replay, maps by account id; a tenant without charges gets `forbidden`
  on checkout; unit — `canCharge(tenant)` gate.
- **Checks:** `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** a tenant connects, webhook flips `chargesEnabled`,
  checkout creates a session on the connected account with the fee.
- [x] done (`src/platform/payments/connect.ts` — `canCharge` (the gate every paid feature asks), `createOnboardingLink` (account once, Stripe-hosted link), `syncAccountStatus` (`account.updated` → `chargesEnabled`/`payoutsEnabled`/`connectOnboardingStatus` by `stripeAccountId`), `resolveFeeModel` (`payment.fee_model` TenantSetting override → `Plan.feeModel` → `none`), `createCheckout` (Checkout Session on the connected account + `application_fee_amount` + `Payment` row keyed by `checkoutSessionId`), `markPaymentSucceeded` (idempotent). `/api/webhooks/connect` — `STRIPE_CONNECT_WEBHOOK_SECRET`, account.updated + checkout.session.completed. `src/modules/payments/module.ts` lifecycle; `/t/<slug>/settings/payments` + `startConnectOnboarding` + `ConnectButton`; `payments.connect` feature; `module.payments` seeded. Integration `connect-webhook.test.ts` — signed via `generateTestHeaderString`, forged sig 400, session.completed flips once + replay no-op, unknown session no-op; unit `canCharge`.)

### 6.4 — `shop` module: products, cart, checkout
- **Goal:** catalog of products → anonymous cart → checkout on the
  connected account → `Order`/`OrderLine`, pickup or shipping.
- **Files:** contract (+`ProductCategory`, `Product`, `ProductVariant`,
  `Cart`, `CartLine`, `Order`, `OrderLine`), migration,
  `src/modules/shop/module.ts`, `src/app/actions/shop.ts`,
  `/sites/[host]/shop`, `/t/<slug>/orders`, nav, translations,
  `module.shop` seed, feature keys (`shop.*`).
- **Tests:** unit — cart totals; integration — add→checkout→order,
  `shop.products.max` enforced, order only in own tenant.
- **Checks:** `pnpm test:integration`, `pnpm audit:tenancy`,
  `pnpm modules:check`.
- **Done when:** a visitor buys a product; the tenant sees the order.
- [x] done (7 models — `ProductCategory`, `Product` (type physical|digital|gift_card|menu_item), `ProductVariant`, `Cart` (`cart_id` cookie → Customer on checkout), `CartLine`, `Order`, `OrderLine` — @@rls cascade, 57 models classified, `deleteTenant` + T9 cover all. `src/lib/shop/totals.ts` — `cartTotal`/`orderTotal` (shipping flat-rate when not pickup). `src/modules/shop/module.ts` lifecycle. Site `/sites/[host]/shop` — products + variants, buy buttons hidden when `!canCharge` (hidden not broken); `addToCart` writes the cookie cart, `checkoutCart` builds Order+OrderLines then asks `createCheckout` (fee computed, Stripe session returned) and clears the cart; `markPaymentSucceeded` flips Order → `paid` via `payment.orderId`. `addProduct` honours `shop.products.max`. `/t/<slug>/orders` gated `orders.view` + `module.shop`. Integration `shop.test.ts` — checkout→Order+session+webhook path, `forbidden` without `chargesEnabled`, tenant isolation; unit totals 2/2; T9 green.)

### 6.5 — `ordering` module: menu items, modifiers, pickup slots
- **Goal:** restaurant pickup ordering on `shop` `menu_item`s with
  modifier groups, pickup time slots with kitchen capacity, a dashboard
  order-status board.
- **Files:** contract (+`ProductModifierGroup`, `ProductModifier`,
  `Order.modifierJson` or `OrderLine.modifiers`), migration,
  `src/modules/ordering/module.ts`, `src/app/actions/ordering.ts`,
  `/sites/[host]/order`, `/t/<slug>/orders/board`, translations,
  `module.ordering` seed.
- **Tests:** unit — `pickupSlots(rules, capacity, existing)`; integration —
  order with modifiers totals, slot capacity enforced, board transitions.
- **Checks:** `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** a diner orders with modifiers for a pickup slot; the
  board moves the order received → preparing → ready → done.
- [x] done (2 models — `ProductModifierGroup` (min/max selections) + `ProductModifier` (price delta) + `OrderLine.modifiers` JSON — @@rls cascade, 59 models classified, `deleteTenant` + T9 cover all. `pickupSlots(rules, capacity, existing)` emits each `slotMinutes` window inside `ReservationRule`s and counts non-canceled orders per slot (kitchen capacity — the server re-checks at `placeOrder`); `orderLineTotal` adds modifiers × quantity. `src/modules/ordering/module.ts` (dependsOn `shop`). `placeOrder` validates `menu_item` products + modifiers, computes totals, writes Order+OrderLines (modifiers as JSON), asks `createCheckout`. `setOrderStatus` walks received→preparing→ready→done. `/sites/[host]/order` + `/t/<slug>/orders/board` (four columns); `ordering` feature + `module.ordering` seed. Unit `pickup-slots.test.ts` 3/3; integration `ordering.test.ts` — modifier totals, slot capacity → `conflict`, board transitions (skip → `invalid_input`).)

### 6.6 — `quotes` module: request → quote → accept → convert
- **Goal:** schema-driven request forms, priced quotes, signed accept
  link, optional deposit checkout, conversion to order or appointment.
- **Files:** contract (+`QuoteRequest`, `Quote`, `QuoteLine`, `QuoteEvent`),
  migration, `src/modules/quotes/module.ts`, `src/lib/quotes/form.ts` (pure
  form-definition validation), `src/app/actions/quotes.ts`,
  `/sites/[host]/quote`, `/sites/[host]/quote/accept/[token]`,
  `/t/<slug>/quotes`, translations, `module.quotes` seed.
- **Tests:** unit — form-definition validation + quote totals; integration —
  full flow request→price→accept(+deposit)→convert; `quotes.monthly` cap.
- **Checks:** `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** a customer's request becomes a paid, converted quote.
- [x] done (4 models — `QuoteRequest` (schema-driven `answersJson`), `Quote` (lines, `depositCents`, `validUntil`, `accessToken` unique signed link, status draft→sent→accepted→declined→converted), `QuoteLine`, `QuoteEvent` — @@rls cascade, 63 models classified, `deleteTenant` + T9 cover all. `src/lib/quotes/form.ts` — `validateFormAnswers` (text/number/select/date/file, required, wrong-type/select-not-an-option/bad-date → `invalid_input`) + `quoteTotal`. `submitQuoteRequest` validates the tenant's `quotes.form` definition server-side + `quotes.monthly` cap. `sendQuote` prices lines → total → `quotes.sent` email with the signed token link. `acceptQuote` — token + validity check + deposit → `createCheckout`. `declineQuote`, `convertQuote` → `Order`+`OrderLine`s. `QuoteEvent` records every transition. `/sites/[host]/quote` (schema-driven render), `/sites/[host]/quote/accept/[token]`, `/t/<slug>/quotes` list + convert button. Feature keys `quotes`, `quotes.monthly`, `quotes.online_acceptance`. Unit `quote-form.test.ts` 5/5; integration `quotes.test.ts` — full request→price→accept(+deposit)→convert, bad token → `not_found`, form validation.)

### 6.7 — Booking deposits
- **Goal:** `booking.deposits` finally wired — a deposit amount on the
  service requires payment at book time; the appointment stays
  `requested`/unpaid until the checkout confirms.
- **Files:** `Service.depositCents` (contract), migration,
  `src/app/actions/booking.ts`, `/sites/[host]/book` deposit step,
  translations.
- **Tests:** integration — deposit required → unpaid booking isn't
  confirmed until `Payment` succeeds; free booking unchanged.
- **Checks:** `pnpm test:integration`.
- **Done when:** a deposit-gated service takes payment before
  confirmation.
- [x] done (`Service.depositCents` — contract + migration `20261029T1607_platform_service_deposit`. `bookAppointment` computes `depositDue` (depositCents + `booking.deposits` + `canCharge`) BEFORE `Appointment.create` — unpaid books as `requested`, not `confirmed`; the branch returns `{id, checkoutUrl}` via `createCheckout` (kind `deposit`, `appointmentId` link). `markPaymentSucceeded` flips a `requested` appointment to `confirmed` + `AppointmentEvent` (actor `system`). `BookingForm` redirects to `checkoutUrl` when present. Integration — deposit service → `checkoutUrl` + `requested` until payment → `confirmed`; deposit-free service books exactly like before.)

### 6.8 — Proportional refunds + payouts view
- **Goal:** `/t/<slug>/payments` — money in/out list; refund action calls
  Stripe with the proportional fee, `Refund` rows record it.
- **Files:** `src/app/actions/payments.ts` (`refundPayment`), payouts page,
  translations.
- **Tests:** unit — `refundFee` math on partial refunds; integration —
  refund records row + fee proportion.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** a refund returns the fee proportionally and shows in the
  payouts view.
- [x] done (`refundPayment` (billing.manage + `module.payments`): `stripe.refunds.create` with `refund_application_fee: true` on the connected account → Stripe returns the fee proportionally; `Refund` row records `amountCents` + `feeRefundCents` (from `refundFee`); `Payment` flips `refunded`/`partially_refunded`. `/t/<slug>/payments` — the payouts view: every Payment with kind, status, fee, and the refunded total, plus a Refund button on `succeeded` rows. Integration `refund.test.ts` — refund → row + proportional fee + `partially_refunded`, full → `refunded`, unsucceeded → `invalid_input`. `refundFee` math already unit-tested in `fee.test.ts`.)

## Exit criteria

All verified at close-out (2026-10-29, 2.69.0):
- `pnpm typecheck` green; `pnpm audit:tenancy` — 63 models classified;
  `pnpm test` — 951 unit; `pnpm test:integration` — 44 files, 130 tests;
  `pnpm modules:check` — 4/4 (10 modules: newsletter, booking,
  reservations, customers, notifications, catalog, team, payments, shop,
  ordering, quotes).
- Fee tests cover every model, rounding, zero, cap, refund —
  `tests/unit/lib/fee.test.ts` (9 tests).
- Stripe test-mode E2E — **deferred, mechanism covered** (see Findings).
- Paid features hidden while `chargesEnabled` is false — `canCharge`
  gates the site shop, ordering, deposit and quote-deposit flows.

## Exit criteria (from the roadmap)

- Unit tests for every fee model, rounding and refunds (`fee.test.ts`).
- E2E in Stripe test mode: shop checkout on a connected account with the
  plan's fee; refund refunds the fee proportionally (noted in findings —
  the mechanism is unit/integration tested; live Stripe E2E needs keys).
- Paid features hidden while `chargesEnabled` is false (`canCharge` gate
  everywhere paid UI renders).
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

- **Stripe test-mode E2E (book→checkout→refund proportional) is deferred** —
  the mechanism is covered: `computeApplicationFee`/`refundFee` unit-tested for
  every model and rounding; `connect-webhook.test.ts` signs payloads with
  Stripe's own `generateTestHeaderString` and proves idempotent replay +
  tenant mapping by account id; `refund.test.ts` proves `refund_application_fee`
  and the proportional `feeRefundCents` row. A live Stripe E2E needs test keys
  and a built app — recorded here, not run.
- **`orders` permission covers shop + ordering + quotes dashboards** — `shop`
  is not its own TENANT_PERMISSIONS resource; `orders.view`/`orders.manage`
  gates the sales surfaces (decision — a tenant's "orders" are the cross-module
  sales record).
- **Convert quotes to Order only** — spec/07 says "order or appointment"; the
  multi-line shape maps to `Order`/`OrderLine`; an appointment conversion is
  a single-appointment subset left out of v1.
- **Booking deposits**: `Service.depositCents` + `booking.deposits` +
  `canCharge` — an unpaid deposit books `requested`, not `confirmed`; the
  webhook flips it.
