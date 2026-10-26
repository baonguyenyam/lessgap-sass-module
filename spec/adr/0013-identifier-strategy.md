# 0013. Identifier strategy: CUID2, UUID v7, NanoID

**Status:** accepted
**Date:** 2026-10-26

## Context
The product owner asked for UUID v7, NanoID and CUID2, each where it fits.
Prisma 8 generates all three in the contract (`@onCreate(cuid(2))`,
`@onCreate(uuid(7))`, `@onCreate(nanoid(n))`) with the `uniku` library. Every
kit model already uses `cuid(2)`.

## Decision

| Kind | Generator | Where | Why |
| --- | --- | --- | --- |
| Primary key of a business record | CUID2: `@onCreate(cuid(2))`, `newId()` | users, tenants, members, sites, services, appointments, orders, quotes, products, knowledge sources … (the default) | not sequential, does not leak creation time or volume, safe in URLs |
| Primary key of an append-only, high-volume table | UUID v7: `@onCreate(uuid(7))` on a native `uuid` column, `newTimeId()` | `AuditLog`, `Job`, `NotificationLog`, usage events, chat messages, `KnowledgeChunk` | time-ordered: inserts stay at the end of the index, rows sort by creation |
| Short code people read or type | NanoID with an unambiguous alphabet: `newPublicCode()` | booking reference, invite code, order number shown to customers | short, no 0/O/1/I/L; unique per tenant by constraint |
| Unguessable token in a URL | NanoID, URL alphabet, ≥ 21 characters: `newUrlToken()` | share links, unsubscribe links, quote view links | 126 bits, URL-safe |
| Sign-in links, password resets, sessions | Better Auth | — | owned by the auth library |

- Ids are made by the contract (`@onCreate`) whenever possible. Application
  code that needs one before the insert calls `@/lib/ids`, which uses the
  same `uniku` generators, so formats match.
- `@/lib/ids` is the only file that imports a generator; lint rejects `uuid`,
  `nanoid`, `cuid`, `@paralleldrive/cuid2`, `ulid`, `uniku/*` and
  `crypto.randomUUID()` elsewhere.
- Never expose an auto-increment integer as an id. Never use `Math.random`
  for anything that identifies or grants.
- Existing kit tables keep CUID2. A table changes kind only through a planned
  migration with a reason in its PR.

## Consequences
- One answer to "which id here?", enforced by lint.
- UUID v7 values reveal their creation time; that is why they are not used
  for records whose existence or timing is private to a tenant's customers.

## Options considered
- **UUID v7 everywhere:** best index locality, but leaks timing on every record.
- **ULID:** similar to UUID v7 with no native Postgres type.
- **Separate npm packages per id type:** three dependencies and three
  implementations next to Prisma's own; `uniku` is already installed by Prisma 8.
