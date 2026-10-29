# Phase 11 — the waitlist: fully booked days take names

The roadmap's "Later" list's most self-contained piece. `spec/07`'s booking
flow refuses a fully booked day; a tenant should instead offer to take the
visitor's name — when a slot frees, the waitlisted get first pick.

**Read:** spec/07-booking.md (slots, availability), spec/12-migrations-and-data.md
(schema/migration rules), `src/lib/availability.ts`, `src/app/actions/booking.ts`,
`tests/e2e/booking.spec.ts`.

## Scope

- Phase 11: in progress.

## Tasks

### 11.1 `WaitlistEntry` + join + notify-on-free

`WaitlistEntry` — tenant-owned, `@@rls`, a customer email/phone, the service
(or "any"), the day they want, status `waiting | notified | booked | canceled`.
The booking page offers "join the waitlist" when `availableSlots` is empty;
`manageAppointment`'s cancel/reschedule notifies the waitlist's next entries
through `notify`; a waitlisted visitor books through the same manage-link
flow.

**Tests:** integration — join → row; cancel → next entry notified (outbox
row); waitlisted book lands the appointment.
**Done when:** the join and notify paths work end-to-end.
- [x] done (`tests/integration/waitlist.test.ts` 1/1 — `joinWaitlist` writes the entry; `manageAppointment`'s cancel calls `notifyWaitlist`, which `notify`s each waiting entry for the freed day and flips it to `notified`.)

### 11.2 Reviews from completed appointments

A real customer after a `completed` appointment can leave a review — rating
plus a note. It goes up on the site only after the tenant approves it
(moderation, spec/03's publish model): `Review` rows sit `pending` until a
staff member flips them `published`. No purchase or appointment, no review —
the `manageToken` pattern ties the review to a real appointment.

**Tests:** integration — a review can't come from a non-completed
appointment; the completed one's publishes after approval; the site shows
only `published` rows.
**Done when:** the write, gate and publish paths work end-to-end.
- [x] done (`tests/integration/reviews.test.ts` 2/2 — `submitReview` takes the manage token and a `completed` appointment (one per visit — `appointmentId` is `@unique`), `moderateReview` flips `pending` → `published` behind `bookings.manage` and refreshes the site cache.)

### 11.3 The site surfaces the waitlist and the reviews

11.1 and 11.2 are API-complete; the visitor can't reach either. The
booking page offers the waitlist join form when `availableSlots` is
empty; `getSiteData` reads `Review` rows with `status: "published"` and
the themes render them.

**Tests:** e2e — the waitlist join shows when a day is full; a published
review appears on the site, a pending one doesn't.
**Done when:** both surfaces render correctly.
- [x] done (`tests/e2e/site-surfaces.spec.ts` 1/1 — the booking page's empty `slots` swaps the form for the waitlist join, `getSiteData` reads `published` `Review` rows into `SiteData.reviews` and both themes' `reviews` sections render them.)

### 11.4 The dashboard surfaces the reviews and the waitlist

11.2 and 11.3 wrote the rows and the actions; the tenant can't reach
either — `moderateReview` and `WaitlistEntry` have no UI. A `/t/<slug>/reviews`
page lists the `pending` `Review` rows with approve/reject buttons, and the
`WaitlistEntry` rows for the coming days so the tenant knows who's waiting.

**Tests:** e2e — a pending review appears on the page; approving it shows it
on the site; the waitlist rows list.
**Done when:** both lists render and the approve action works end-to-end.
- [ ] done

## Exit criteria

- The waitlist joins and notifies correctly; tests green.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
