# 0022. The Job table stays — measured against the phase-8 drain target

**Status:** accepted
**Date:** 2026-10-29

## Context
ADR 0008 chose `Job` + `FOR UPDATE SKIP LOCKED` over a queue service,
revisiting at phase 8 against measured volume (spec/16: 1,000 due jobs
drain in under 2 minutes with two runners, no double-run).

## Measured
- Job kinds registered: 11 (reminders, purge, export, domain verify,
  domain reconcile, tenant delete, tenant snapshot ×2, email outbox,
  module lifecycle). Peak write volume is reminders at ~15-min cadence —
  well under 1,000/min.
- The drain loop's `SKIP LOCKED` claim is exercised by the O1 test —
  two concurrent claims never run the same row.
- No job exceeds a Vercel function invocation today; snapshot/restore
  chains split long work into jobs as spec/16 prescribes.

## Decision
Keep the `Job` table. The move to Trigger.dev/QStash is the same trigger
ADR 0008 named: **minute granularity is not enough, or runs outgrow a
function invocation**. Neither holds today — revisiting costs a config
change (`src/platform/jobs/`), never a rewrite.

## Consequences
- `platform.tenant.snapshot_nightly` (8.3) and `platform.domain.reconcile`
  (8.2) are the new long-running kinds; both chain per tenant.
- `/platform/usage` watches queue depth — the trigger shows there first.
