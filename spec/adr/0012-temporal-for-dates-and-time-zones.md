# 0012. Temporal (polyfill) for dates and time zones

**Status:** accepted
**Date:** 2026-10-26

## Context
Tenants are in the United States (several time zones, daylight saving) and
owners and staff may work from Vietnam (`Asia/Ho_Chi_Minh`, UTC+7, no DST).
Booking, reminders and opening hours must be exact across zones and DST
transitions. The product owner asked for whatever handles US and Vietnam time best.

## Decision
Use the TC39 Temporal API through `@js-temporal/polyfill` (the reference
polyfill, already used in platform.madelab.io). All time logic goes through
`src/platform/time.ts`, which imports the polyfill once; when every runtime
we support ships Temporal natively, that file switches to the global and
nothing else changes. Formatting for display uses `Intl.DateTimeFormat` with
the viewer's locale (`en-US` or `vi-VN`) and the tenant's or viewer's zone.

- Instants in the database: `DateTime` (UTC), converted with `Temporal.Instant`.
- Wall-clock rules (opening hours, availability): `Temporal.PlainTime` plus
  weekday, resolved in the tenant's zone with `Temporal.ZonedDateTime`.
- Dates without time (holidays, closures): `Temporal.PlainDate`.
- DST gaps and overlaps resolved with an explicit `disambiguation` choice,
  tested (catalogue B2).

## Consequences
- One model of time for the whole codebase; no `Date` arithmetic in modules.
- The polyfill adds weight to client bundles; client code receives formatted
  strings or ISO values from the server where possible.

## Options considered
- **date-fns + date-fns-tz:** smaller, familiar; built on `Date`, which makes
  wall-clock and DST reasoning easy to get wrong.
- **Luxon:** solid zones support; a second model of time we would replace when Temporal is native.
