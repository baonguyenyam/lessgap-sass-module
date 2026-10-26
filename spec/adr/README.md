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
| [0001](./0001-fork-and-keep-upstream-mergeable.md) | Fork the kit and keep it mergeable with upstream | superseded by 0011 |
| [0002](./0002-shared-database-tenant-id-and-rls.md) | Shared database, `tenantId` on every tenant row, RLS as second line | proposed |
| [0003](./0003-better-auth-organizations-for-tenants.md) | Tenants are Better Auth organizations | proposed |
| [0004](./0004-vercel-for-subdomains-and-custom-domains.md) | Vercel for Platforms for subdomains and custom domains | proposed |
| [0005](./0005-themes-are-code.md) | Themes are code in the repository | proposed |
| [0006](./0006-stripe-connect-for-tenant-payments.md) | Stripe Connect for tenant payments | proposed |
| [0007](./0007-pgvector-for-rag.md) | pgvector in the main database for the chatbot | proposed |
| [0008](./0008-jobs-table-before-a-queue.md) | A jobs table processed by cron before a queue service | proposed |
| [0009](./0009-brevo-for-email-ses-later.md) | Brevo for email now, Amazon SES later, one transport | accepted |
| [0010](./0010-modules-are-plugins-with-a-kernel.md) | Modules are plugins on a kernel | proposed |
| [0011](./0011-independent-project-kit-as-reference.md) | Independent project; the kit is a reference, not an upstream | accepted |
| [0012](./0012-temporal-for-dates-and-time-zones.md) | Temporal (polyfill) for dates and time zones | accepted |
| [0013](./0013-identifier-strategy.md) | Identifier strategy: CUID2, UUID v7, NanoID | accepted |
| [0014](./0014-root-role.md) | ROOT above ADMIN, granted by configuration | accepted |
| [0015](./0015-switch-as.md) | Switch As: ROOT opens a session as another account | proposed |
| [0016](./0016-tests-live-in-tests.md) | Every test lives in tests/ | accepted |
| [0017](./0017-sentry-for-error-tracking.md) | Sentry for error tracking, `ErrorReport` table in the app | proposed |
| [0018](./0018-cloudflare-r2-for-storage.md) | Cloudflare R2 for media, exports, snapshots and platform backups | accepted |
| [0019](./0019-tenant-roles-are-permission-groups.md) | Tenant roles are permission groups: built-in owner/manager/staff plus custom roles via `dynamicAccessControl` | proposed |
