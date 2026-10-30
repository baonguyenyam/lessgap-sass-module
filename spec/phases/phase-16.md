# Phase 16 — the sidebar covers the surface

Phases 11–15 built models and actions faster than the dashboard could
hold them — the sidebar still skips what exists: `payments` and `quotes`
have pages but no nav item, `Location`/`IntakeForm`/`Package`/`Membership`
have models but no page, and `WaitlistEntry` is buried inside the reviews
page.

**Read:** `src/components/layout/app-shell/nav.ts`,
`src/app/(dashboard)/t/[slug]/`, spec/07-modules.md,
spec/13-conventions.md.

## Scope

- Phase 16: in progress.

## Tasks

### 16.1 The existing pages get their nav items

`payments` and `quotes` have pages but no sidebar entry — the operations
group needs them (`payments` next to the customers' money, `quotes` next
to the bookings the tenant quotes for).

**Done when:** the two items render under the right group.
- [x] done (`payments` and `quotes` nav items in `operations` — `payments` next to the customers' money, `quotes` next to the bookings.)

### 16.2 `/t/<slug>/locations` — a tenant's branches

`Location` is a model without a surface — a page lists the branches and
lets the tenant add one (name + address).

**Done when:** the page lists and creates.
- [x] done (`/t/<slug>/locations` lists and adds branches via `createLocation` — `Location` nav item in `operations`.)

### 16.3 `/t/<slug>/intake` — the forms and their responses

`IntakeForm`/`IntakeResponse` exist; the tenant can't build a form or read
the answers — a page lists the forms, lets the tenant add one (name +
fields JSON), and shows the responses per form.

**Done when:** the form's fields define and the answers land.
- [x] done (`/t/<slug>/intake` lists forms + responses and adds a form via `createIntakeForm` — `intake` nav item in `operations`.)

### 16.4 `/t/<slug>/products` — the sellable catalog

`buyPackage`/`activateMembership` need `Package`/`Membership` rows to
sell — a page creates and lists them (name + sessions/priceCents).

**Done when:** the definitions exist so the till can sell them.
- [ ] done

### 16.5 `/t/<slug>/waitlist` — the waitlist's own page

The waitlist rows live on `/t/<slug>/reviews` — a dedicated page lists
them by `wantedDate` and lets the tenant mark one `canceled`/`booked`.

**Done when:** the waitlist's list renders and the actions land.
- [ ] done

## Exit criteria

- Every page the dashboard's models need exists and is nav'd.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
