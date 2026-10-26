# 0008. A jobs table processed by cron before a queue service

**Status:** proposed
**Date:** 2026-10-26

## Context
We need delayed and repeated work: reminders, domain checks, re-indexing,
usage reporting, tenant deletion. The kit already uses Vercel Cron.

## Decision
A `Job` table and one cron route that claims due jobs with
`FOR UPDATE SKIP LOCKED`, runs them with retries and backoff, and records
errors. Every job handler is idempotent and takes a `system` TenantContext.
Job kinds are registered in modules' `jobs.ts`.

## Consequences
- No new provider; jobs are visible and replayable in the platform console.
- Minute-level granularity only; long jobs must be split.
- Move to a queue (Inngest, Trigger.dev, QStash) when volume or latency needs it;
  the handler interface stays the same.

## Options considered
- **Trigger.dev (used by platform.madelab.io):** good, but a second deploy target from day one.
- **Inngest / QStash:** same trade-off; reconsider in phase 8.
