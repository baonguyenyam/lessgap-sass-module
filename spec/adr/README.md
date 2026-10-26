# Architecture decision records

One file per decision, numbered, never renumbered. Template:

```md
# NNNN. Title in the imperative

**Status:** proposed | accepted | superseded by NNNN
**Date:** YYYY-MM-DD

## Context
What forces the decision. Facts, constraints, numbers.

## Decision
What we do. One paragraph, then specifics.

## Consequences
What becomes easier, what becomes harder, what we must now do.

## Options considered
Each rejected option and the reason it lost.
```

| # | Decision | Status |
| --- | --- | --- |
| [0001](./0001-fork-and-keep-upstream-mergeable.md) | Fork the kit and keep it mergeable with upstream | proposed |
| [0002](./0002-shared-database-tenant-id-and-rls.md) | Shared database, `tenantId` on every tenant row, RLS as second line | proposed |
| [0003](./0003-better-auth-organizations-for-tenants.md) | Tenants are Better Auth organizations | proposed |
| [0004](./0004-vercel-for-subdomains-and-custom-domains.md) | Vercel for Platforms for subdomains and custom domains | proposed |
| [0005](./0005-themes-are-code.md) | Themes are code in the repository | proposed |
| [0006](./0006-stripe-connect-for-tenant-payments.md) | Stripe Connect for tenant payments | proposed |
| [0007](./0007-pgvector-for-rag.md) | pgvector in the main database for the chatbot | proposed |
| [0008](./0008-jobs-table-before-a-queue.md) | A jobs table processed by cron before a queue service | proposed |
