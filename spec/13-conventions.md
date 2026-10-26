# Code conventions

**Status:** `draft`

The kit's rules in `AGENTS.md` and `.agents/rules/` apply. This adds the
conventions platform code needs so that the hundredth module reads like the first.

## Results and errors

- **Server actions** return a discriminated union, never throw to the client:

  ```ts
  type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: { code: ErrorCode; message: string; field?: string } }
  ```

  `message` is translated (`getTranslations`). `code` is from the shared
  `ErrorCode` union in `src/platform/errors.ts`:
  `unauthorized`, `forbidden`, `not_found`, `invalid_input`, `conflict`,
  `limit_reached`, `feature_unavailable`, `module_inactive`, `rate_limited`,
  `payment_required`, `internal`.
- **Services** throw typed errors (`new AppError("limit_reached", {...})`).
  One wrapper, `action(handler)`, turns them into `ActionResult` and logs
  unexpected errors. Actions are written with it, never with ad-hoc try/catch.
- **Route handlers** map the same codes to HTTP: 401, 403, 404, 400, 409,
  402 (`limit_reached`, `payment_required`), 404 (`feature_unavailable`,
  `module_inactive`), 429, 500. JSON body `{ error: { code, message } }`.
- Another tenant's record is `not_found`, never `forbidden`.
- Never put stack traces, SQL, ids of other tenants or secrets in a message.

## Logging

- One logger, `log` from `src/platform/log.ts`, structured:
  `log.info("booking.appointment.confirmed", { tenantId, appointmentId })`.
  Event names are `<area>.<what>`; fields are ids and counts.
- Never log personal data (names, emails, phones, message bodies), secrets or
  tokens. Email addresses are masked like the kit's `maskAddresses`.
- `log.error` for anything a human should look at; it carries `tenantId` and a
  request id when there is one.

## Audit

Anything a tenant would ask "who changed this?" about writes `audit(ctx,
action, target, data)`: prices, staff, settings, domains, plan, members,
module enable/disable, refunds. Action names follow `<module>.<entity>.<verb>`.

## Validation

- Zod schemas live in the module's `schema.ts` (or `src/lib/schemas` for kit
  code) and are shared by the form and the action. The server re-parses every time.
- Parse at boundaries: form data, request bodies, query strings, webhook
  payloads, JSON columns, env, third-party responses.

## Money

- `Int` in the smallest unit plus a currency code. Never `Float`, never
  strings with symbols in storage.
- Format only at the edge with `formatMoney(amount, currency, locale)` from
  `src/platform/money.ts`. Arithmetic in integers; rounding rules live in the
  function that needs them, with tests.

## Time

- Store UTC. Every tenant has an IANA `timeZone`; display and slot
  calculations convert with `src/platform/time.ts`, which wraps one date
  library chosen in phase 0 (Temporal polyfill or date-fns-tz; an ADR records it).
- Wall-clock values (opening hours) are `"HH:mm"` plus weekday, interpreted in the tenant's zone.
- Code that needs "now" takes a `now` parameter or a clock, so tests are deterministic.

## Internationalisation

- Dashboard strings: `src/locales/<lang>.json` (kit rule). Module strings live
  under a `modules.<key>.*` namespace in the same files.
- Tenant content in several languages is data: `{ en: "...", vi: "..." }`
  columns validated by a schema, never translation-file keys.
- The platform name never appears in tenant-facing copy except the plan badge.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Module key | lowercase, `_` if needed | `booking`, `gift_cards` |
| Feature key | `<module>[.<capability>][.<limit>]` | `booking.deposits`, `booking.staff.max` |
| Permission | `<module>.<verb>` | `booking.manage` |
| Event | `<module>.<entity>.<past-tense>` | `booking.appointment.confirmed` |
| Job kind | `<module>.<what>` | `booking.reminders` |
| Audit action | `<module>.<entity>.<verb>` | `catalog.service.price_changed` |
| Dashboard route | `/t/[slug]/<module-nav-href>` | `/t/rosy-nails/bookings` |
| Files | kebab-case | `available-slots.ts` |
| Service function | verb first | `confirmAppointment(ctx, id)` |

## Performance

- Lists are paginated (cursor by default) and capped.
- No query in a loop; load with `in` and map.
- Site pages are cached by host and revalidated by tag; dashboard pages are dynamic.
- Anything over 100 ms on a hot path gets a measurement before and after a change.

## Comments and docs

Kit style: full sentences, explaining why. A module's `module.ts` starts with
a comment saying what the module is for and linking its spec section.
