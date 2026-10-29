# 0023. Log drain stays deferred — function logs + ErrorReport rows

**Status:** accepted
**Date:** 2026-10-29

## Context
The operations ladder puts a log drain (Better Stack/Axiom) at "we need
>1 day retention or search". Phase 8 reviews it against what operators
actually reach for.

## Measured
- Everything a human queries later is already a row: `ErrorReport`
  (grouped by digest, 30-day retention), `AuditLog`, `EmailMessage`,
  `UsageCounter`, `DomainCheck`, `TenantSnapshot`, `Job`.
- Function logs carry only the request line + event names — nothing a
  console page can't reconstruct from rows.
- `/platform/usage`, `/platform/errors`, `/platform/jobs`,
  `/platform/emails`, `/platform/audit` cover every page in spec/16's
  ops table.

## Decision
No drain yet. The trigger stands unchanged: **retention beyond a day or
full-text search across function logs**. Rows, not log lines, are the
observability surface; a drain is a config change when the need lands.
