# 0025. A tenant's second branch is a `Location`, not a second tenant

**Status:** proposed
**Date:** 2026-10-29

## Context

The roadmap's "Later" list wants a tenant with several branches — one
business, two addresses, shared staff and shared customers. The current
model puts `tenantId` on everything; a "second location" could be a second
tenant (simple, breaks sharing) or a `Location` inside one tenant (right,
needs a schema change to every tenant-owned table that cares about place —
`StaffMember`, `Appointment`, `Service`, `Order`).

## Decision

Add `Location` as a tenant-owned sibling of `Site` — a tenant has one or
more; every location-scoped table (`StaffMember`, `Appointment`,
`AvailabilityRule`, `TimeOff`, `Order`) gets `locationId` nullable-now
(one-location tenants keep `null` — the field only bites when the second
location exists). `Site` gains `locations` so the public page can render
both.

## Consequences

A one-location tenant is unchanged (`locationId` stays `null` — the
nullable FK keeps the migration additive, no backfill). The booking flow's
"choose your branch" lands on the staff pick, not a new screen. The
alternative (second tenant) loses shared customers and shared branding for
the sake of one less schema change — rejected.
