# 0024. Keep contract ownership in sections of the public schema

**Status:** accepted
**Date:** 2026-10-27

## Context

Prisma 8 uses one contract and one migration history. Phase 0 needs a clear
owner for every model so later platform and module work does not edit another
owner's models. ADR 0002 already chose one PostgreSQL schema for the shared
database, with `tenantId` and RLS providing tenant isolation.

## Decision

Keep all models in the `public` schema and mark ownership with ordered comment
sections in `prisma/contract.prisma`: `kit`, `platform`, then one section per
module. Only the named owner changes models in its section. Relations between
sections follow `spec/12-migrations-and-data.md`.

## Consequences

- Ownership is visible in the single contract without changing table names or
  creating database namespaces.
- Migration planning and the single migration history remain unchanged.
- Reordering or renaming comment sections must not create a contract or schema
  migration; test this when changing ownership markers.
- A model ownership transfer requires updating the section marker and migration
  owner plan together.

## Options considered

- **A PostgreSQL namespace per module:** rejected because ADR 0002 established
  one shared schema, and module namespaces would complicate grants, RLS policy
  review and cross-owner relations without improving tenant isolation.
