# Billing and payments

**Status:** `draft`

There are two money flows, and they never share code paths or tables.

| Flow | Who pays whom | Stripe product | Tables |
| --- | --- | --- | --- |
| Platform billing | Tenant pays us | Stripe Billing on the platform account | `Plan`, `Subscription`, `PlatformInvoice` (kit models, moved to the tenant) |
| Tenant payments | Customer pays the tenant | Stripe Connect, charges on the tenant's connected account | `Payment`, `Payout`, plus the module's own record (Appointment, Order, Quote) |

## Platform billing

- Extends what the kit has (`src/lib/billing.ts`, the webhook in
  `src/app/api/webhooks/`), with the subscription owned by the tenant instead
  of the user. One subscription per tenant.
- Plans have monthly and yearly prices. Add-ons are extra subscription items on
  the same subscription.
- **Setup fee**: a one-time invoice item added to the first invoice, for the
  custom theme work. Amount per plan, overridable by staff per deal.
- Free plan: no Stripe subscription until upgrade.
- `past_due` → grace period (plan setting, default 7 days) → `suspended`.
- Staff can apply coupons and set custom prices for one tenant (an unlisted
  plan, or Stripe price override), always with an audit entry.

## Tenant payments (Stripe Connect)

[ADR 0006](./adr/0006-stripe-connect-for-tenant-payments.md).

- The owner connects payouts in **Settings → Payments**: Stripe-hosted
  onboarding for a connected account owned by the tenant. We never collect
  bank details or tax ids ourselves.
- Charges are created on the connected account with an application fee. The
  tenant is the merchant of record: their name on the customer's statement,
  their refunds, their disputes.
- Until onboarding is complete and charges are enabled, every paid feature on
  the site (deposits, shop checkout, paying a quote) is hidden, not broken.
- One webhook endpoint for Connect events, separate from the platform billing
  webhook, with its own signing secret.

### Business models

What we earn from a tenant's sales is configured per plan and overridable per
tenant. All amounts are integers in the smallest currency unit; percentages
are basis points. The calculation is one pure function,
`computeApplicationFee(model, amount, context)`, with tests for each model.

| Model | Key | Fee | Typical use |
| --- | --- | --- | --- |
| Subscription only | `none` | 0 | Tenants on higher plans |
| Percentage | `percent` | `amount × bps / 10000` | Shop, ordering |
| Fixed per transaction | `fixed` | constant | Deposits |
| Percentage plus fixed | `percent_fixed` | both | Default for most plans |
| Per booking | `per_booking` | constant per confirmed appointment, charged on the platform invoice monthly | Tenants who take no online payment |
| Capped percentage | `percent_capped` | percentage up to a cap per transaction | Large catering quotes |

Rules:

- The fee never exceeds the charge, and is never negative.
- Refunds refund the application fee proportionally, by default.
- `per_booking` is usage-based billing on the platform subscription, metered
  through `UsageCounter` and reported to Stripe; it uses the kit's metered
  billing support.

## Required tests

- Unit: `computeApplicationFee` for every model, rounding, zero, cap, refund.
- Integration: Connect webhook signed with Stripe's SDK, idempotent on replay,
  mapped to the right tenant by connected account id.
- Integration: a tenant without charges enabled cannot create a checkout session.
