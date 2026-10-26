# 0002. Shared database, tenantId on every tenant row, RLS as second line

**Status:** proposed
**Date:** 2026-10-26

## Context
Hundreds to thousands of small tenants, each with little data. Isolation
mistakes are the worst failure we can have. platform.madelab.io already runs
this model (scoped repositories, `tenantId` everywhere, RLS phases, a schema
audit in CI) and it held.

## Decision
One PostgreSQL database and schema. Every tenant-owned table has `tenantId`.
Application access goes through `tenantDb(ctx)`, a Prisma extension that
injects and enforces the scope. Postgres RLS policies on every tenant table
check `current_setting('app.tenant_id')`, set with `SET LOCAL` inside a
transaction. A CI script fails on any model that is not classified.

## Consequences
- One migration path, one backup, cheap tenants.
- Every query on tenant data pays for a transaction with `SET LOCAL`; measure in phase 3.
- Platform-wide queries need a separate path that bypasses RLS, kept inside `src/platform/`.

## Options considered
- **Schema per tenant:** migrations multiply by tenant count; Prisma handles it poorly.
- **Database per tenant (Neon project per tenant):** strongest isolation, cost and
  operational load too high for $0–$100/month tenants. Possible later for a dedicated contract.
- **Application filter only, no RLS:** one forgotten `where` leaks data; RLS is cheap insurance.
