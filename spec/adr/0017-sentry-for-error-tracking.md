# 0017. Sentry for error tracking, ErrorReport table in the app

**Status:** accepted (with phase 0, task 0.14, 2026-10-27)
**Date:** 2026-10-26

## Context
`log.error` today writes a line nobody can query once the deployment is big:
Vercel function logs are short-retention and per-invocation. We need errors
searchable by tenant and request, grouped, and alerting without watching a
log stream — while staying on free tiers ([operations](../16-operations.md)).
platform.madelab.io runs Sentry in production already.

## Decision
Two sinks behind the one `log.error` call:

1. **Sentry** (`@sentry/nextjs`): server, edge and client configs; activated
   only when `SENTRY_DSN` (and `NEXT_PUBLIC_SENTRY_DSN` for the client) is
   set, so local and preview work without it. `beforeSend` scrubs personal
   data and secrets; we tag `tenantId` and `requestId`, never user ids or
   names. Source maps upload in CI only when `SENTRY_AUTH_TOKEN` exists.
2. **`ErrorReport` table** in our own database: one row per error digest with
   count, first/last seen, request id and tenant id, powering the
   `/platform/errors` console page. Written in every environment — it is the
   record that survives when the SaaS tier or retention does not.

Unhandled exceptions reach Sentry via `onError` instrumentation hooks; caught
ones reach it through `log.error`. Email alerting on new issue groups is the
first alert channel.

## Consequences
- Every developer sees errors without a Sentry account (the console page);
  every production error is alertable without a database query.
- The masking rule for `log` now has a second place to violate: `beforeSend`
  is tested like `maskAddresses` is.
- Moving to paid Sentry or self-hosted GlitchTip later changes no call site —
  the table and the tagging contract stay.

## Options considered
- **Table only:** free forever, but no grouping quality, source maps or
  alerting — a person would have to watch the console page.
- **GlitchTip (self-hosted Sentry protocol):** free at any volume, but it is
  one more service to run and back up from day one; the SDK is the same, so
  it stays a config-level fallback.
- **Better Stack / Axiom for errors too:** covers logs but not client errors
  and source maps; revisitable with the log-drain decision.
