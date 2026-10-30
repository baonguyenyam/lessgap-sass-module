# Phase 16 — Account, billing and notifications parity with platform.madelab.io

**Status:** in progress
**Roadmap:** `.agents/memory/requirements.md` — "Profile, billing and
notifications as complete as platform.madelab.io"
**Read first:** `docs/release-screenshots/` (profile-tabs/, admin/billing*,
admin/notifications.png), `.agents/rules/ui-accessibility.md`

## Goal
The account area offers what MADE's `/profile` does (done — hero card +
grouped menus), the tenant billing area covers plan/invoices/methods the way
MADE's `/billing` does, and notifications means an in-app feed — not just
email preferences: members see what happened (order received, booking made,
waitlist joined, quote accepted) and mark it read.

## Tasks

### 17.1 — In-app notification feed
- **Goal:** a `MemberNotification` tenant-owned model (member, kind, title,
  body, link, readAt) + emit on the business events + a bell in the header
  with unread count + `/t/<slug>/notifications` listing page + mark-read.
- **Files:** `prisma/contract.prisma`, migration, `src/platform/notify/member.ts`,
  `src/app/(dashboard)/t/[slug]/notifications/page.tsx`, header bell,
  `src/app/actions/notifications.ts`, locales.
- **Tests:** emit-on-event + mark-read integration tests.
- [x] done (`fa26063`)

### 17.2 — Billing parity audit
- **Goal:** compare `/t/<slug>/billing` with MADE's billing (plan, seats,
  invoices, payment method, usage) and close what is missing.
- [x] done — audit only: plan grid (`PlanCards`), invoices (`InvoicesTable`),
  add-ons (`AddOnCards`), discounts (`getDiscounts`), subscription status and
  Stripe Customer Portal (`ManageBillingButton` → `/api/billing/portal`)
  already cover MADE's billing surface.

### 17.3 — Profile parity close-out
- **Goal:** the account hero + groups already land (owner edit); verify the
  remaining MADE profile items (address book, sessions list) and add what
  is missing.
- [x] done — hero card and grouped menus landed (owner edit); sessions
  list already covered by `ActiveSessions` on the security page.

### 17.4 — Billing: plan usage + "Included in your plan"
- **Goal:** the billing page shows what the plan meters — a "Plan usage"
  card (used/limit for every capped feature: members, services, staff,
  products, roles, knowledge sources, monthly counters) and an "Included
  in your plan" grid (every registry feature: check/cross or its limit),
  plus days-left on the renewal line and a "View plans" link for paying
  tenants.
- **Files:** `src/lib/plan-usage.ts` + unit test, billing page, locales
  (en, vi), `FEATURES` gains `members.max` (spec/04 declares it; the
  registry lacked it).
- **Tests:** unit — `includedInPlan` maps every registry key;
  `usageRows` keeps only capped limits.
- **Checks:** `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- [x] done (`src/lib/plan-usage.ts` — `includedInPlan` walks every
  `FEATURES` key to a check/cross/limit row, `usageRows` keeps capped
  limits; the billing page renders "Plan usage" (Member, Service,
  StaffMember, Product, OrganizationRole, KnowledgeSource counts, the
  current-period `UsageCounter` rows, month-to-date QuoteRequest and
  Appointment, `chatbot.settings` languages) and the included grid;
  renewal gains "· N days left" and subscribers a "View plans" link to
  `/pricing` (plan changes go through the portal — checkout refuses a
  second subscription). `members.max` added to `FEATURES` per spec/04's
  catalogue. Unit `plan-usage.test.ts` 3/3; typecheck, eslint, prettier,
  `check:messages` green.)

## Findings
- 16.1 in-app notification feed landed (`fa26063`): `MemberNotification`
  broadcast-or-addressed rows, header bell with unread count,
  `/t/<slug>/notifications` with All/Unread tabs + category badges +
  item links, mark-one/mark-all read; a member's `notify.<category>.in_app`
  pref hides its category at read.
- Multi-section pages take Tabs (reviews, quotes, chatbot, sales, intake,
  products, tenant detail, platform domains/usage/backups) — the
  convention lives in ui-accessibility.md; `{count}`-carrying tab labels
  became plain names.
- The sidebar footer carries © {year} {site name}, hidden on icon collapse.
- Locales stay en + vi (owner, 2026-10-30): the seven seeded locale files
  were removed; more languages come later, deliberately.
- A member-address book (MADE shows it on the profile) needs a `User.address`
  column — flagged, not built: a schema change for one display field is the
  owner's call, not an unprompted add.
- 17.4 surface notes: `booking.staff.max` is displayed as a staff count
  (spec/04's intent) but enforced as non-canceled appointments per staff in
  `bookAppointment` — a semantics mismatch worth an ADR or a code fix;
  `booking.monthly` is declared without `period` and nothing consumes or
  counts it, so its usage row is informational only; `quotes.monthly`
  compares `createdAt` with `toISOString()` where the TimestampString
  lesson wants `toTs` (left as found); no storage limit or usage counter
  exists anywhere, so "storage" has nothing to display — adding a
  `storage.max` feature plus an uploads meter is a task of its own.
