# 0018. Cloudflare R2 for media, exports, snapshots and platform backups

**Status:** accepted
**Date:** 2026-10-26 (accepted by owner 2026-10-26)

## Context
The platform needs object storage for four things: tenant media (service
photos, menus, galleries — phase 3+), module exports (phase 2), per-tenant
snapshots and nightly database dumps ([operations](../16-operations.md)). The
architecture table left this open ("Vercel Blob or S3-compatible"); the kit
already declares `R2_*` environment variables.

## Decision
Cloudflare R2 behind `src/platform/storage/` — the only file that imports the
S3 client. Buckets are private; reads and downloads go through short-TTL
signed URLs. Keys are prefixed by purpose (`media/`, `exports/`, `snapshots/`,
`platform-backups/`, all under `<tenantId>/` where tenant-owned) so bucket
lifecycle rules and a future per-tenant report stay simple. Bundles and dumps
are gzip-compressed before upload.

## Consequences
- Zero egress fees make per-tenant snapshots, restores and media serving
  cheap at scale — the property that matters most for thousands of tenants.
- One bucket per environment (`lessgap-dev`, `lessgap-staging`,
  `lessgap-prod`), not per tenant; isolation is key-prefix plus the code that
  signs URLs, exactly as the database isolates by `tenantId`.
- Local development and tests use a fake (an in-memory or MinIO-compatible
  stub behind the same interface); CI never needs real R2 credentials.

## Options considered
- **Vercel Blob:** simplest wiring on Vercel, but egress-priced and per-GB
  storage costs more; exports and nightly dumps would pay egress on every
  restore.
- **AWS S3:** the same API R2 speaks; chosen later instead of R2 only if R2's
  durability or feature gaps (object-lock, inventory) ever matter — the
  wrapper makes that a credentials change.
- **Postgres `bytea` or a database table for files:** simplest, and turns the
  database into the file server we then have to back up twice.
