# Roadmap

**Status:** `draft`

Each phase ends in something deployable, with its exit criteria checked by
commands or tests, not by impression. A phase does not start until the one
before it meets its exit criteria. Work outside the current phase's scope is
out of scope, even when it looks small: write it down under "Later" instead.

| Phase | Name | Sellable after it? | Status |
| --- | --- | --- | --- |
| 0 | Foundation | no | not started |
| 1 | Tenancy core | no | not started |
| 2 | Plans, entitlements, platform billing | no | not started |
| 3 | Site engine and domains | yes: brochure sites | not started |
| 4 | Catalog, team, verticals, onboarding | yes: sites with price lists | not started |
| 5 | Booking, reservations, customers, notifications | **yes: launch for salons and restaurants** | not started |
| 6 | Payments, shop, ordering, quotes | yes | not started |
| 7 | Chatbot | yes | not started |
| 8 | Hardening and scale | — | not started |

---

## Phase 0 — Foundation

**Goal:** the rules, checks and decisions every later phase relies on.
**Brief:** [phases/phase-0.md](./phases/phase-0.md)

**Scope**
- Accept or amend ADRs 0002–0008 and 0010 (0001 superseded by 0011; 0009, 0011, 0012 accepted).
- Integration test layer with a real PostgreSQL locally and in CI; migration checks (M1, M2).
- Prisma schema split by owner (`prisma/schema/`).
- Module kernel skeleton, `pnpm new:module`, `pnpm modules:check`, boundary lint.
- Shared conventions: errors, action wrapper, logger, money, time.
- Platform domain is `lessgap.app`: add apex, `www` (redirect) and `app` to the Vercel project.
- Sites domain is `lessgap.io`: move it to Vercel nameservers and add `*.lessgap.io` as a wildcard domain.
- Replace the Italian locale and docs with Vietnamese; English stays the default.
- `scripts/audit-tenancy.mjs` running in CI (passes trivially: no tenant models yet).
- Error tracking: Sentry behind env, `ErrorReport` written by `log.error`, request ids stamped by the proxy ([operations](./16-operations.md), ADR 0017).
- `Job` table and the cron runner route (ADR 0008), accepting Vercel Cron and an external pinger.
- `EmailMessage` delivery record written by `sendEmail()`.
- Add `vi` to dashboard locales scaffolding (decision in ADR 0001's notes), or record that it waits.
- CI on pnpm with a frozen lockfile and a type-check step (done 2026-10-26).

**Exit criteria**
- CI green with the tenancy audit step.
- `spec/adr/0001`–`0008` have status `accepted` or `superseded`.
- `lessgap.app` and `app.lessgap.app` serve the deployment over HTTPS; `*.<sites-domain>` has a wildcard certificate.

## Phase 1 — Tenancy core

**Read:** [tenancy.md](./02-tenancy.md), [data-model.md](./09-data-model.md), ADR 0002, 0003.
**Brief:** [phases/phase-1.md](./phases/phase-1.md)

**Scope**
- Better Auth organization plugin; `Tenant`, `Member`, `Invitation`; `platformRole` on `User`.
- `TenantContext`, `requireTenantMember`, `tenantDb`, model classification list, permissions map.
- RLS helper (`SET LOCAL app.tenant_id` in a transaction) and the first policy.
- Dashboard moves under `/t/[slug]`; tenant switcher; invitations by email.
- Platform console skeleton at `/platform`: tenants list, tenant detail, suspend and reactivate, impersonation with reason and audit.
- Ops pages in the console: `/platform/jobs`, `/platform/emails`, `/platform/errors` ([operations](./16-operations.md#the-ops-pages)).
- `AuditLog` writer.
- Remove `Project` from the product surface.

**Exit criteria**
- Isolation integration test suite passes with two tenants.
- `tenantDb` unit tests: missing scope throws.
- E2E: member of A gets 404 on B's dashboard; impersonation shows banner and writes audit rows.

## Phase 2 — Plans, entitlements, platform billing

**Read:** [entitlements.md](./04-entitlements.md), [billing.md](./05-billing.md).

**Scope**
- Feature registry, `getEntitlements`, `requireFeature`, `consumeLimit`, `UsageCounter`.
- `PlatformSwitch` with the initial set; platform console pages for switches, plans, overrides.
- Kit billing re-owned by tenant; add-ons; setup fee; free plan without Stripe subscription.
- Pricing page reads public plans; signup respects `signup.*` switches.
- Grace period and suspension on `past_due`.
- **Settings → Modules** page: enable, disable, export data, scheduled delete with a 7-day grace period, cancel; the same in the platform console. Test cases L1–L10.

**Exit criteria**
- Resolver unit tests for every layer combination.
- Concurrency test on `consumeLimit`.
- E2E: switching `signup.free_plan.enabled` off removes the free plan from pricing and signup; downgrade hides a feature without deleting data.

## Phase 3 — Site engine and domains

**Read:** [architecture.md](./01-architecture.md), [domains.md](./03-domains.md), [sites-themes-verticals.md](./06-sites-themes-verticals.md), ADR 0004, 0005.

**Scope**
- Proxy host resolution and rewrite to `/sites/[host]`; reserved slugs; dev host map.
- `Site`, `SiteSettings`, `Page`, `Media`; dashboard pages for business info, hours, pages, appearance, sections.
- Theme registry, theme manifest type, one shared theme built to the full contract with fixtures.
- Per-host `robots.txt`, `sitemap.xml`, LocalBusiness JSON-LD; cache tags and revalidation on save.
- Custom domains: Vercel wrapper, `Domain` lifecycle, verification job, primary and redirects.

**Exit criteria**
- E2E: a tenant created in the console is served at `<slug>.<sites-domain>`; editing hours shows on the site within 10 seconds.
- E2E with a dev custom host: primary domain redirect works; subdomain redirects to it.
- Accessibility E2E passes on the shared theme's fixture site.
- Unit: host resolution for every row of the table in domains.md.

## Phase 4 — Catalog, team, verticals, onboarding

**Read:** [modules.md](./07-modules.md) (`catalog`, `team`), [sites-themes-verticals.md](./06-sites-themes-verticals.md#verticals).

**Scope**
- `catalog` and `team` modules, site sections for both.
- Vertical definitions for `nail_salon`, `barber`, `restaurant`, `dental`, `generic`; sample data marked and removable.
- Onboarding wizard (self-service and staff-created).
- A second shared theme, to prove the theme contract holds for two designs.

**Exit criteria**
- E2E: signup → wizard → site live with the vertical's sample services.
- Both shared themes render the same `SiteData` fixture with no theme-specific data code.

## Phase 5 — Booking, reservations, customers, notifications (launch)

**Read:** [modules.md](./07-modules.md) (`booking`, `reservations`, `customers`, `notifications`), [security-compliance.md](./10-security-compliance.md).

**Scope**
- Availability engine and its test suite; exclusion constraints against double booking.
- Booking flow on the site; calendar in the dashboard; staff view of own appointments.
- Reservations for restaurants.
- Customers module with consent records, export and delete.
- `notify` with email templates; SMS behind its feature with consent and STOP handling; reminders job.
- `/platform/emails/templates`: per-locale preview and send-test for every template (templates stay code).
- Dental vertical's PHI restrictions applied.

**Exit criteria**
- Availability unit tests include daylight-saving transitions in `America/Chicago` and `America/New_York`.
- Integration: two simultaneous bookings for the same slot → exactly one succeeds.
- E2E: book → confirmation email → reschedule via manage link → reminder job sends.

## Phase 6 — Payments, shop, ordering, quotes

**Read:** [billing.md](./05-billing.md), [modules.md](./07-modules.md) (`payments`, `shop`, `ordering`, `quotes`), ADR 0006.

**Scope**
- Connect onboarding; Connect webhook; `computeApplicationFee` with every model.
- Deposits for bookings; shop with pickup and shipping; restaurant ordering with modifiers and pickup slots; quotes from request to conversion.

**Exit criteria**
- Unit tests for every fee model, rounding and refunds.
- E2E in Stripe test mode: shop checkout on a connected account with the plan's fee; refund refunds the fee proportionally.
- Paid features hidden while `chargesEnabled` is false.

## Phase 7 — Chatbot

**Read:** [chatbot-rag.md](./08-chatbot-rag.md), ADR 0007.

**Scope**
- pgvector, `KnowledgeSource`, `KnowledgeChunk`, ingestion jobs, re-index on events.
- Tools for services, hours, slots; handoff to booking and quotes; dashboard for sources, settings, conversations.
- Limits and kill switches.

**Exit criteria**
- The three required tests in chatbot-rag.md pass.
- Cost per 1,000 messages measured and recorded in the ADR.

## Phase 8 — Hardening and scale

**Read:** [operations.md](./16-operations.md) — it owns the targets and the drill shapes.

**Scope**
- RLS on every tenant table verified by a test that lists tables without a policy.
- Daily reconciliation of Vercel domains with `Domain` rows, reported on `/platform/domains`.
- Backups in all three layers: nightly `pg_dump` to R2 by a scheduled workflow, `TenantSnapshot` on demand then nightly, PITR window verified; a restore drill run and written up (database and tenant, O5–O6); `/platform/backups` page.
- `/platform/usage` page: usage counters, job throughput, error rate, queue depth.
- Load test of the site surface to the targets in [operations.md](./16-operations.md#scale-targets); cache hit rate measured.
- Revisit the queue decision ([ADR 0008](./adr/0008-jobs-table-before-a-queue.md)) and the log-drain decision against measured volume; ADR whichever way it lands.
- Public Suffix List submission for the sites domain.
- Analytics module.

---

## Later (not scheduled)

- Passkeys for members and platform staff.
- In-place per-tenant restore (v1 restores to a new tenant).
- Realtime updates (Pusher/Ably) for the dashboard.
- Public status page; push notifications (FCM).
- Gift cards, memberships and packages for salons.
- Reviews collection (from real customers after a completed appointment only).
- Google Business Profile and Reserve with Google integration.
- Waitlist for fully booked days.
- Patient intake forms (requires HIPAA decision first).
- Multiple locations per tenant.
- Dedicated deployment for enterprise contracts.
