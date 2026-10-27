# 0006. Stripe Connect for tenant payments

**Status:** accepted
**Date:** 2026-10-26

## Context
Tenants take deposits, sell products and get paid for quotes. We want a fee
on some of those payments and do not want to hold their money, handle their
refunds or be merchant of record.

## Decision
Each tenant connects a Stripe account through Stripe-hosted onboarding.
Charges are created on the connected account with an application fee
computed by `computeApplicationFee`. Connect events arrive at a separate
webhook endpoint. Our own billing of tenants stays on the platform account.

## Consequences
- Tenants see their own Stripe dashboard, payouts, disputes.
- We never store bank or tax details.
- Tenants who do not want Stripe cannot take online payments; they can still use booking without deposits.

## Options considered
- **Platform as merchant of record, payouts to tenants:** money transmission and
  liability we do not want.
- **Tenant's own Stripe keys pasted into settings:** no fee mechanism, secret handling per tenant, weak security.
- **Square or Clover:** popular with salons and restaurants; worth an
  integration later for in-store POS sync, not as the base.
