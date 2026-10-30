# Phase 17 — Account, billing and notifications parity with platform.madelab.io

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

## Findings
- A member-address book (MADE shows it on the profile) needs a `User.address`
  column — flagged, not built: a schema change for one display field is the
  owner's call, not an unprompted add.
