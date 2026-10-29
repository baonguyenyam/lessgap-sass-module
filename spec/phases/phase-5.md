# Phase 5 — Booking, reservations, customers, notifications (launch)

**Status:** draft
**Roadmap:** [roadmap.md#phase-5--booking-reservations-customers-notifications-launch](../roadmap.md)
**Read first:** [modules.md](../07-modules.md) (`booking`, `reservations`,
`customers`, `notifications`), [security-compliance.md](../10-security-compliance.md),
[module-system.md](../15-module-system.md).

## Goal

A tenant can take real bookings. The availability engine is a pure function —
`availableSlots(rules, timeOff, existingAppointments, service, staff?,
range, tz)` — and the database, not just the code, prevents double bookings
with exclusion constraints. Customers book on the site (service → staff →
time → details → confirmation with calendar file and manage link) and the
dashboard shows a calendar plus each staff member's own schedule.
Reservations reuse the time utilities for restaurants. Customers carry
recorded consent; `notify()` is the one sender — email via `sendEmail()`,
SMS behind its feature with consent and STOP — and a reminders job fires
24 h/2 h before an appointment. The `/platform/emails/templates` page
previews and test-sends every template per locale; templates stay code.
Dental tenants get booking without PHI fields (decision: v1 does not handle
PHI).

## Out of scope

- Payments/deposits at booking time — phase 6 (`booking.deposits` exists as
  a gate but checkout wiring is phase 6).
- SMS provider sending — the consent, STOP and job scaffolding are here; a
  real provider lands behind the same `SmsProvider` interface later
  (decision 5-B).
- Recurring appointments, multi-service bookings, waiting lists — v1
  shapes only.
- `analytics` — phase 8.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 5-A | Double-booking enforcement | Exclusion constraint / SELECT-then-INSERT | **`tstzrange` exclusion constraint** per spec/07 — the database refuses overlap, code races cannot create one |
| 5-B | SMS sending | Real Twilio / provider interface | **`SmsProvider` interface** like `DomainProvider` — `local` logs, `twilio` behind `TWILIO_*` env; consent + STOP enforced in `notify()` regardless |
| 5-C | Booking→customer identity | Member-based / own `Customer` table | **Own `Customer`** per spec/07 — a booker has no login; dedup by email then phone |
| 5-D | Reminders transport | Cron route / `platform.job` row | **`platform.job` kind** `booking.remind` — same runner as `platform.domain.verify`, enqueued hourly by the existing scheduler |

## Tasks

### 5.1 — Availability engine
- **Goal:** `src/lib/availability.ts` — `availableSlots(rules, timeOff,
  appointments, service, staff?, range, tz)`: weekly rules → candidate
  slots, minus timeOff, minus existing appointments (with service buffer),
  "any staff" picks the staff with most open slots, last-slot-of-day
  boundary, closures, minNotice/maxAdvance. Pure, `src/lib`, mirrored test.
- **Files:** `src/lib/availability.ts`, `tests/unit/lib/availability.test.ts`.
- **Tests:** unit — DST transitions in `America/Chicago` AND
  `America/New_York`, overlapping buffers, "any staff", last slot, closure,
  min notice, max advance.
- **Checks:** `pnpm test`, `pnpm typecheck`.
- **Done when:** the DST and edge-case suite is green.
- [x] done (`src/lib/availability.ts` — `availableSlots(rules, timeOff, appointments, service, staff, range, tz, options)`: weekly `WeeklyRule` rows → 15-min-step candidates filtered to the rule's wall window (`localMinutesOfDay` so a slot inside a DST gap is never offered), minus `TimeOff`, minus existing appointments (busy window vs actual time — buffer-vs-buffer is fine, `status: canceled` ignored), `minNotice`/`maxAdvance`. "Any staff" emits one slot per start on the least-busy free staff. `wallToUtc`/`localDate`/`localWeekday` are the DST-safe conversions (fixed-point `t = wall - offset(t)`). 15 unit tests: spring-forward `America/New_York` + `America/Chicago`, fall-back both, buffers, "any staff", last-slot-of-day, closure, min notice, max advance.)

### 5.2 — Booking, customer and notification schema
- **Goal:** `Resource`, `AvailabilityRule`, `TimeOff`, `Appointment`,
  `AppointmentEvent`, `Customer`, `NotificationLog` — all tenant-owned,
  `@@rls`, cascade; `Appointment` carries UTC `startTs`/`endTs`,
  status (`requested`/`confirmed`/`completed`/`canceled`/`no_show`),
  source, notes; `Customer` consents (`marketingConsentAt`,
  `smsConsentAt`, sources); exclusion constraints on
  `(staffId, tstzrange)` and `(resourceId, tstzrange)` excluding canceled.
- **Files:** `prisma/contract.prisma`, migration (hand-written `execute` for
  the exclusion constraints — the planner's hole), `models.ts`,
  `delete-tenant.ts`.
- **Tests:** T9 covers the models; constraint verified in 5.9.
- **Checks:** `pnpm db:emit`, `pnpm db:plan`, `pnpm db:migrate`,
  `pnpm audit:tenancy`.
- **Done when:** models + constraints exist, deletion verified.
- [x] done (7 tenant-owned models in `contract.prisma` — `Resource`, `AvailabilityRule` (weekday + local minutes), `TimeOff`, `Customer` (consent stamps: `marketingConsentAt/Source`, `smsConsentAt/Source`), `Appointment` (UTC `startTs`/`endTs`, `requested→confirmed→completed|canceled|no_show`, `source`, `remindedAt`), `AppointmentEvent` (status history), `NotificationLog` (channel/template/recipient/provider status) — all `@@rls` cascade, all classified (45 models), all in `deleteTenant`, T9 green. `appointment_no_double_staff` + `appointment_no_double_resource` exclusion constraints on `tsrange(startTs,endTs)` `status <> 'canceled'` — `btree_gist` for the text keys. Raw-SQL ops written as literal `SqlMigrationPlanOperation` objects — the `sql` tagged-template is for column expressions, not migration ops.)

### 5.3 — `booking` module + dashboard calendar
- **Goal:** `src/modules/booking/module.ts` manifest + lifecycle;
  `requireTenantContext("bookings")`; appointment actions (create with
  availability re-check + constraint, confirm/cancel/complete/no_show with
  `AppointmentEvent` history, audit); `/t/<slug>/calendar` list-calendar
  grouped by day; `/t/<slug>/team` gains each staff member's own
  appointments (a staff member without a login sees only theirs via the
  staff portal token — decision: dashboard members filter by staff id).
- **Files:** `src/modules/booking/*`, `src/app/actions/appointments.ts`,
  `/t/<slug>/calendar/*`, nav, translations, `module.booking` seed,
  `booking.staff.max`/`booking.monthly`/`booking.manual_approval`/
  `booking.sms_reminders`/`booking.deposits`/`booking` FEATURES entries.
- **Tests:** lifecycle L-tests; unit — `memberCan(bookings.*)`; integration —
  create respects `booking.manual_approval` (instant vs requested).
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** appointments create/cancel/complete with audit + events.
- [ ] done

### 5.4 — Site booking flow
- **Goal:** `/sites/[host]/book` — pick a service, staff (or "any"), a slot
  from `availableSlots`, enter name/email/phone, consent checkbox;
  `bookAppointment` re-checks availability + creates `Appointment`
  (status `confirmed` unless `booking.manual_approval`) + `Customer`
  upsert (dedup email→phone, consent stamps) + `AppointmentEvent` +
  `notify` confirmation with an ICS file + a signed manage link
  (`/sites/[host]/book/manage/[token]` — reschedule or cancel).
- **Files:** `src/lib/booking/manage-token.ts` (HMAC), `src/lib/ics.ts`,
  `src/platform/booking/*`, `src/app/sites/[host]/book/*`,
  `src/app/actions/booking.ts`, translations.
- **Tests:** unit — token sign/verify, ICS shape; integration — booking
  creates appointment+customer+event; manage link reschedules.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** a visitor books, gets a confirmation + ICS, and manages it.
- [ ] done

### 5.5 — `customers` module
- **Goal:** `src/modules/customers/module.ts` + `/t/<slug>/customers` —
  list (deduped by email then phone), consent badges, per-customer export
  (JSON of their rows), per-customer delete (privacy request) with audit;
  `Customer` is the privacy boundary — never cross-tenant.
- **Files:** `src/modules/customers/*`, `src/app/actions/customers.ts`,
  `/t/<slug>/customers/*`, nav, translations, `module.customers` seed.
- **Tests:** lifecycle L-tests; integration — export returns the customer's
  rows only, delete removes only that tenant's row, dedup holds.
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** customers list, export, delete work per-tenant.
- [ ] done

### 5.6 — `notifications` module + `notify()` + templates page
- **Goal:** `src/modules/notifications/module.ts`; `notify(ctx, template,
  recipient, data)` — resolves the template (code, per-vertical default,
  per-tenant override in `TenantSetting`), sends via `sendEmail()` (ADR
  0009), logs `NotificationLog`; `/platform/emails/templates` standalone
  page — every template × locale preview + send-test (staff only).
- **Files:** `src/modules/notifications/*`, `src/platform/notify/*`,
  `src/emails/templates/*` (code templates — booking.confirmation,
  booking.reminder, booking.canceled, customer.export),
  `src/app/(platform)/platform/emails/templates/*`, nav, translations.
- **Tests:** unit — template resolution + `NotificationLog` write;
  integration — `notify` never crosses tenants, missing template falls back.
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** every template previews per locale and `notify` logs.
- [ ] done

### 5.7 — Reminders job + SMS consent gate
- **Goal:** `platform.booking.remind` job — appointments `confirmed` with
  `startTs` inside a tenant's reminder windows (default 24 h, 2 h) and not
  yet reminded → `notify(booking.reminder)`; email always, SMS only when
  `booking.sms_reminders` entitled AND `Customer.smsConsentAt` set;
  `SmsProvider` (`local` logs, `twilio` env) behind the interface;
  `smsStop(phone)` clears consent + logs; provider webhook stub records
  `NotificationLog.status`.
- **Files:** `src/platform/notify/sms.ts`, `src/platform/jobs/registry.ts`,
  `src/app/api/webhooks/sms/route.ts` (STOP), tests.
- **Tests:** unit — window selection, consent gating; integration — the job
  sends reminders once, STOP clears consent.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** reminders fire once per window and SMS respects consent.
- [ ] done

### 5.8 — `reservations` module
- **Goal:** `Table`, `ReservationRule`, `Reservation` (schema added here,
  tenant-owned); `src/modules/reservations/module.ts`; `reservationSlots`
  (reuses availability core with service-period rules); `/sites/[host]/reserve`
  party-size → period → slot → details → confirm; dashboard
  `/t/<slug>/reservations` list.
- **Files:** contract (+3 models), `src/modules/reservations/*`,
  `src/lib/availability.ts` (`reservationSlots`), site page, actions,
  translations, `module.reservations` seed.
- **Tests:** unit — `reservationSlots` respects capacity+turn time;
  integration — reservation lifecycle.
- **Checks:** `pnpm db:emit`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy`.
- **Done when:** a restaurant takes a reservation on the site.
- [ ] done

### 5.9 — Exclusion constraints + dental PHI restrictions
- **Goal:** prove the database refuses overlap — two simultaneous bookings
  for the same staff slot → exactly one succeeds; same for a resource.
  `dental` vertical: no clinical fields anywhere — `Appointment.notes`
  carries a "no PHI" hint on dental tenants, the booking form labels say so,
  the chatbot later refuses clinical questions (phase 7 note).
- **Files:** tests only (+ a comment/hint string in the dental path).
- **Tests:** integration — concurrent `bookAppointment` on one slot, one
  wins, the loser gets `conflict`; unit — dental booking schema rejects a
  clinical field.
- **Checks:** `pnpm test:integration`.
- **Done when:** the exclusion constraint is proven in a race test.
- [ ] done

## Exit criteria

- Availability unit tests include daylight-saving transitions in
  `America/Chicago` and `America/New_York`.
- Integration: two simultaneous bookings for the same slot → exactly one
  succeeds.
- E2E: book → confirmation email → reschedule via manage link → reminder
  job sends. (E2E run noted in findings — the mechanism is unit/integration
  tested.)
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

- Decision 5-D: the dental vertical collects name/contact/preferred time
  only — no clinical intake — per spec/10's v1 no-PHI decision.
