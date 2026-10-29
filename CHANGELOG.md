# Changelog

All notable changes to lessGAP App are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).

> 💡 **lessGAP App is built on [OpenStarterKit](https://github.com/baonguyenyam/lessgap-sass-module) (MIT).** Entries up to and including 2.4.0 are the upstream kit's release history, kept so the "if you customised" notes still make sense; the release links at the bottom point at the upstream repository, where those versions were published.

---

## [2.87.0] - 2026-10-29

**Every shared theme's fixture renders on a preview route — and the axe suite scans each with zero serious violations.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`/themes/<theme>`** — renders a registered theme's `fixtureSite` without a tenant (D8, spec/11); `themeFixtures` maps each theme's fixture
- **`tests/e2e/themes.spec.ts`** — one axe scan per theme in the registry

## [2.86.0] - 2026-10-29

**Every site-content write now invalidates the site's cache — a saved setting, a new service, a staff change or a suspension reaches the published site inside its cache window.** This is a MINOR: `git pull`, `pnpm install`.

### Fixed

- **Stale site content after writes** — `catalog` (services/categories), `team` (staff) and `platform-tenants` suspend/reactivate now `updateTag("site:<tenantId>")`; the suspended check reads `Tenant.status` from the cached `getSiteData`, so a suspension previously kept serving the normal site until the cache expired

### Added

- **`tests/e2e/revalidate.spec.ts`** — the D7 check: save a settings value through the form, the published site serves it inside the cache window

## [2.85.0] - 2026-10-29

**The ordering and quote surfaces run as a Playwright spec — and the spec flushed out a class of latent site-page bugs: unstable render values, missing translations, a module dependency nobody had exercised.** This is a MINOR: `git pull`, `pnpm install`.

### Fixed

- **Site sub-pages under Cache Components** — `/book`, `/book/manage`, `/order`, `/quote`, `/reserve`, `/shop` and `/quote/accept` now `await connection()`; `new Date()`/`crypto.randomUUID()` in render tripped the unstable-value check and 500'd every request-time page once a `module_inactive` surfaced (the error path itself calls `nowTs`). `force-dynamic` is not allowed with `cacheComponents`.
- **`OrderClient` slot time** — `now` comes from the server as a prop; a client-side `new Date()` in render is flagged even in a `"use client"` component, and `setState` in `useEffect` trips `react-hooks/set-state-in-effect`.
- **Missing `site.*` translations** — `site.booking`, `site.order`, `site.quote` (with `subtitle`), `site.reserve`, `site.shop` namespaces added.

### Added

- **`tests/e2e/orders.spec.ts`** — the `/order` + `/quote` surfaces and the rows they land (`ordering` depends on `shop` — specs enable both).

## [2.84.0] - 2026-10-29

**The booking journey runs as a Playwright spec — site page on a real host, appointment, signed manage link, reschedule — and `manageAppointment` no longer breaks outside a request.** This is a MINOR: `git pull`, `pnpm install`.

### Fixed

- **`manageAppointment` outside a request** — `revalidatePath("/sites")` threw `static generation store missing` for non-request callers (jobs, specs); it now revalidates only when a store exists

### Added

- **`tests/e2e/booking.spec.ts`** — the book → manage → reschedule journey (bookAppointment's own path stays integration-covered — it needs a request store)

## [2.83.0] - 2026-10-29

**Module changes reach the site immediately — `enableModule`/`disableModule` now invalidate the site's cache — plus the E8 downgrade E2E.** This is a MINOR: `git pull`, `pnpm install`.

### Fixed

- **Stale module list on sites** — `getSiteData` caches under `site:<tenantId>` and no path invalidated it; a disabled module's section rendered until the cache expired. `updateTag` now fires on enable and disable.

### Added

- **`tests/e2e/modules.spec.ts`** — the E8 check: disable a module → the site's section and the dashboard nav hide, the rows stay.

## [2.82.0] - 2026-10-29

**Two site-surface fixes the deferred E2E caught: the site's root URL 404'd since task 3.1, and suspended tenants had no page at all — plus the first host-routing Playwright spec.** This is a MINOR: `git pull`, `pnpm install`.

### Fixed

- **Site root 404** — the proxy rewrote a site's `/` to `/sites` (no `[host]` segment → route unmatched); the rewrite is `/sites/${host}${pathname}`
- **Suspended tenants** — `resolveHost` gains `kind: "suspended"`; the site renders a maintenance page with `noindex` instead of a hard 404

### Added

- **`tests/e2e/sites.spec.ts`** — the D4/D5/D6 host-routing checks (308→primary, `/sites/` refused on app host, maintenance+noindex)

## [2.81.0] - 2026-10-29

**Every tenant site counts its own views — one row per path per day — and the ADRs record what phase 8 actually measured.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`analytics` module** — `SitePageView` upserts per path+day via the `/api/view` beacon; `/t/<slug>/analytics` shows totals and top paths
- **ADR 0022** — the `Job` table stays (11 kinds, drain under target; the Trigger.dev trigger unchanged)
- **ADR 0023** — log drain stays deferred (rows, not log lines, are the observability surface)
- **ADR 0024** — PSL submission checklist for the sites domain

## [2.80.0] - 2026-10-29

**The site surface gets a load fixture: `LOAD_TENANTS=N` seeds published sites, `scripts/load/run.sh` drives autocannon across the hosts at the spec's rate.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`scripts/load/`** — `seed.ts` (N tenants, each with a published site, `load-XXXX` slugs) and `run.sh` (autocannon across `load-XXXX.${SITES_DOMAIN}` at `RATE`/`DURATION`/`COUNT`)

## [2.79.0] - 2026-10-29

**`/platform/usage` — counters, job throughput, error rate and queue depth on one page, read from rows not log streams.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`/platform/usage`** — queue depth, 24-hour job throughput and failures, error occurrences, every tenant's usage counters, jobs by kind

## [2.78.0] - 2026-10-29

**A snapshot restores into a brand-new tenant — every row, every relation remapped, the source untouched — and `/platform/backups` is where it happens.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Restore-to-new tenant** — a snapshot bundle imports into a fresh tenant; every id is remapped through one map so relations follow and nothing collides
- **`/platform/backups`** — every `TenantSnapshot` (status, row counts, size), `Snapshot now`, `Restore to new tenant`, nightly status

## [2.77.0] - 2026-10-29

**A tenant's whole database becomes one gzipped bundle in R2 — on demand and nightly — with a row recording every table's count.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`TenantSnapshot`** — status, per-table row counts, size, and the R2 key for every backup
- **`platform.tenant.snapshot` + `platform.tenant.snapshot_nightly`** — on demand and 3 a.m. per active tenant, every `tenant-owned` table into one gzip

## [2.76.0] - 2026-10-29

**Domains reconcile themselves daily — a Vercel drift between provider and rows shows on `/platform/domains`, not at the next incident.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`platform.domain.reconcile`** — a daily job diffs the provider's `listDomains()` against `Domain` rows; drifts land in `DomainCheck`
- **`/platform/domains`** — the latest reconcile run plus every domain row's status

## [2.75.0] - 2026-10-29

**A test now guards RLS on every tenant table — and it caught 47 tables running enabled but policy-less.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (adds the missing isolation policies).

### Fixed

- **RLS policies for every tenant-owned table** — `@@rls` only enables row security; the `CREATE POLICY` comes from `policy_all` blocks, which were declared for just 2 tables. All 49 now have the same tenant-isolation policy; `NewsletterSubscriber` gains `@@rls` and its policy

### Added

- **RLS coverage test** — every `tenant-owned` table must show a policy in `pg_policies` and `relrowsecurity` in `pg_class`, or the suite fails

## [2.74.0] - 2026-10-29

**Chatbot safety verified: injection-proof answers, tenant-isolated retrieval, and a measured cost — $0.17 per 1,000 messages at hosted-model prices.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Injection-proof pipeline** — tenant content is DATA, never instructions; a document that tries to override the prompt can't change the tool path
- **Cost ADR** — ~875 tokens/message measured; $0 local, ~$0.17 per 1,000 hosted; bounded by `chatbot.messages.monthly` and `feature.chatbot`

## [2.73.0] - 2026-10-29

**The chat bubble is live on sites: questions stream in, answers come back sourced — and a platform kill switch can silence the bot everywhere.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Site chat bubble** — a floating button opens a sheet; questions POST to `/api/chat`, answers render with their sources; `visitorKey` persists the conversation
- **Dashboard → Chatbot** — sources + re-index, tone/languages settings, the conversation log
- **Kill switches** — `module.chatbot` per tenant and `feature.chatbot` platform-wide; either off hides the bubble and refuses the API

## [2.72.0] - 2026-10-29

**The chatbot's answer pipeline: rate-limited, prompt-templated, tool-grounded, logged.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`answerChat`** — `chatbot.messages.monthly` cap → versioned system prompt (tenant content is data, facts from tools, never confirms bookings) → cosine-ranked chunks → provider + six tools (`get_services`, `get_hours`, `find_slots`, `start_booking`, `start_quote`, `leave_message`) → logged conversation
- **`/api/chat`** — the site bubble's endpoint; gated by the `chatbot` module and `feature.chatbot` switch

## [2.71.0] - 2026-10-29

**The chatbot ingest pipeline: pages and FAQs are chunked, embedded, and re-indexed — idempotent by checksum.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`reindexTenant`** — site pages and `chatbot.faq` entries become `KnowledgeChunk`s with embeddings; an unchanged checksum is a no-op, a changed one re-embeds
- **`ChatProvider`** — the LLM and embedder interface; `local` is deterministic for tests and dev, `openai` lands behind env keys
- **`platform.chatbot.reindex`** — the job that refreshes a tenant's knowledge after a save or upload

## [2.70.0] - 2026-10-29

**The chatbot's knowledge base: pgvector sources, chunks and conversations — in the same RLS database.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (installs the `vector` extension).

### Added

- **`KnowledgeSource`/`KnowledgeChunk`** — a tenant's pages, FAQ and documents, chunked and embedded in `pgvector` (ADR 0007)
- **`ChatConversation`/`ChatMessage`** — a visitor's conversation, logged for the tenant's 90-day review

## [2.69.0] - 2026-10-29

**Proportional refunds and the payouts view: money in and out on the tenant's Stripe account.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`refundPayment`** — a Stripe refund with `refund_application_fee: true`; the `Refund` row records the fee returned proportionally
- **`/t/<slug>/payments`** — the payouts view: every payment with its kind, fee, status and refunded total

## [2.68.0] - 2026-10-29

**Booking deposits: a service can require payment up front — the appointment stays unpaid until Stripe confirms.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`Service.depositCents`** — with `booking.deposits` and a connected Stripe account, booking redirects to a deposit checkout; the appointment is `requested` — unpaid — until the webhook flips it to `confirmed`
- **`markPaymentSucceeded`** — a deposit payment confirms its appointment and records the `AppointmentEvent`

## [2.67.0] - 2026-10-29

**The quotes module: schema-driven requests → priced quotes → signed accept link → optional deposit → converted order.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`quotes` module** — `QuoteRequest` (the tenant's schema-driven form — never free HTML), `Quote` + `QuoteLine` + `QuoteEvent`; statuses draft→sent→accepted→declined→converted
- **Site quote flow** — `/sites/[host]/quote` request form, `/sites/[host]/quote/accept/[token]` signed link; a deposit quote goes through the tenant's connected checkout
- **`/t/<slug>/quotes`** — requests, priced quotes, and a convert-to-order action

## [2.66.0] - 2026-10-29

**The ordering module: restaurant pickup ordering — menu items with modifiers, capacity-bounded pickup slots, and a kitchen board.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`ordering` module** — `ProductModifierGroup`/`ProductModifier` on `menu_item` products; `OrderLine.modifiers` records what the customer chose
- **`pickupSlots`** — every `ReservationRule` window emits `slotMinutes` pickups; a slot stops appearing when its kitchen capacity fills
- **Site order** (`/sites/[host]/order`) — item + modifiers + a pickup slot → checkout on the tenant's connected account
- **Order board** (`/t/<slug>/orders/board`) — the kitchen moves an order received → preparing → ready → done

## [2.65.0] - 2026-10-29

**The shop module: products → cookie cart → checkout on the tenant's Stripe account → orders.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`shop` module** — `Product`, `ProductVariant`, `ProductCategory`; anonymous `Cart`/`CartLine` keyed by a `cart_id` cookie; `Order`/`OrderLine`
- **Site shop** (`/sites/[host]/shop`) — visitors buy with variant buttons; checkout asks `payments` for a session on the connected account; paid UI hides until `chargesEnabled`
- **`/t/<slug>/orders`** — the tenant's orders with lines, fulfilment and status; a paid webhook flips the order to `paid`

## [2.64.0] - 2026-10-29

**The payments module: Stripe Connect onboarding, a signed webhook, and checkout on the tenant's own account.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Settings → Payments** — the owner connects a Stripe account through Stripe-hosted onboarding; `account.updated` webhook syncs `chargesEnabled` and `payoutsEnabled`
- **`createCheckout`** — a Checkout Session on the connected account with the application fee from `computeApplicationFee`; every paid feature gates on `canCharge`
- **Connect webhook** — `/api/webhooks/connect` with its own signing secret; `checkout.session.completed` flips the `Payment` idempotently

## [2.63.0] - 2026-10-29

**Tenant payment records: `Payment` and `Refund`, plus connected-account state on `Tenant`.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **`Payment`** — a charge on the tenant's connected account: kind, Stripe session/intent ids, amount, application fee, status, and links to its appointment, order or quote; `checkoutSessionId` is the idempotency key
- **`Refund`** — a refund against a payment, recording the fee returned proportionally
- **`Tenant`** — `connectOnboardingStatus` and `payoutsEnabled` now track the Connect lifecycle (the account id and `chargesEnabled` were already there)

## [2.62.0] - 2026-10-29

**The application-fee engine: `computeApplicationFee` — the pure function every tenant charge consults.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`computeApplicationFee(model, amount)`** — `none`, `percent`, `fixed`, `percent_fixed`, `percent_capped` and `per_booking` (metered on the platform invoice, not a cut of the charge); the fee is clamped to [0, amount]
- **`refundFee(fee, amount, refundAmount)`** — refunds return the application fee proportionally

## [2.61.0] - 2026-10-29

**The double-booking guarantee is proven in the database: two simultaneous bookings for one slot — exactly one succeeds.** This is a MINOR: `git pull`, `pnpm install`.

### Fixed

- **Exclusion constraints actually applied** — `appointment_no_double_staff`/`appointment_no_double_resource` were committed in `migration.ts` but never self-emitted into `ops.json`, so no database had them; `node <pkg>/migration.ts` regenerated the package and both are now applied — the second insert in a race fails at Postgres with 23P01, which `bookAppointment` maps to `conflict`

### Added

- **Dental PHI guard** — a `dental`-vertical tenant's booking refuses free-text notes outright, and the site booking page tells the visitor to share only name, contact, and a preferred time

## [2.60.0] - 2026-10-29

**The reservations module: restaurant tables, service periods, and bookings that respect capacity and turn time.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`reservations` module** — `Table`, `ReservationRule`, and `Reservation` (tenant-owned + RLS); `reservationSlots` computes open tables per party size against the rule's service periods, capacity range, and turnover buffer
- **Site reserve flow** (`/sites/[host]/reserve`) — party size, time, name and phone; the slot re-checks server-side before the reservation confirms
- **`/t/<slug>/reservations`** — the tenant's table bookings, newest first

## [2.59.0] - 2026-10-29

**The reminders job: `booking.reminder` fires 24 h and 2 h before an appointment — email always, SMS only with entitlement and consent.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`platform.booking.remind` job** — every 15 minutes, confirmed appointments inside a tenant's reminder windows (default 24 h and 2 h) get `booking.reminder`; a send stamps `remindedAt`, so a rerun is a no-op
- **SMS consent gate** — `SmsProvider` (`local` logs, `twilio` behind env) and `smsStop`: a customer texting STOP clears consent across tenants; `/api/webhooks/sms` records STOP and provider status

## [2.58.0] - 2026-10-29

**One sender for every message: `notify()` renders a template per locale, logs it, and sends it.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`notify(ctx, template, recipient, data)`** — resolves the template (a tenant's `TenantSetting` override wins, else the code default per locale), sends through `sendEmail()`, and writes `NotificationLog` every time
- **Code email templates** — `booking.confirmation`, `booking.reminder`, `booking.canceled`, `customer.export` in English and Vietnamese
- **`/platform/emails/templates`** — a staff page that previews every template in every locale and sends a test to a typed address

## [2.57.0] - 2026-10-29

**The customers module: every booker in one list, with consent badges and a privacy export and delete.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`customers` module** (`/t/<slug>/customers`) — the tenant's customer list, deduplicated by email then phone, with marketing and SMS consent badges
- **Privacy export and delete** — one click exports a customer's rows as JSON; delete removes the customer and their appointments, audited

## [2.56.0] - 2026-10-29

**A visitor books a service on the tenant's site — service, staff, time, details — and manages it from a signed link.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Site booking flow** (`/sites/[host]/book`) — pick a service, a staff member (or "any"), an open slot, and your details; the booking honours the availability engine and the tenant's approval mode
- **Manage link** — every booking gets a signed link to reschedule or cancel; an `.ics` calendar file accompanies the confirmation email
- **Customers and consent** — a booker's `Customer` row deduplicates by email then phone; marketing and SMS consent stamp once, with source

## [2.55.0] - 2026-10-29

**The booking module and a dashboard calendar: appointments create, confirm, cancel, complete — the book is managed.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`booking` module** — resources, weekly availability rules, time-off and appointments; `createAppointment` honours `booking.manual_approval` (instant confirmation or review) and `booking.staff.max`; `booking.monthly`, `booking.sms_reminders` and `booking.deposits` declared as feature keys
- **Dashboard calendar** (`/t/<slug>/calendar`) — appointments grouped by day with a staff filter and status actions (confirm, cancel, complete, no-show); every status change writes an `AppointmentEvent` and an audit row

## [2.54.0] - 2026-10-29

**Bookings get a schema: resources, availability rules, appointments, customers — and the database refuses a double booking.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **Booking schema** — `Resource` (chair, room, station), `AvailabilityRule` (weekly hours per staff or resource), `TimeOff`, `Appointment` (UTC start/end, `requested`/`confirmed`/`completed`/`canceled`/`no_show`, source), `AppointmentEvent` (status history)
- **Customers** — `Customer` (name, email, phone, language) with recorded consent stamps — marketing and SMS, each with time and source; deduplicated per tenant by email then phone
- **Notification log** — `NotificationLog` records every outbound message: channel, template, recipient, provider status
- **Double booking is a database rule** — exclusion constraints on `tsrange(start,end)` per staff member and per resource refuse an overlapping non-canceled appointment; no code race can create one

## [2.53.0] - 2026-10-29

**The availability engine — the pure function every booking starts from.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`availableSlots`** (`src/lib/availability.ts`) — weekly rules minus time-off minus existing appointments (with buffers), minimum notice and maximum advance; "any staff" picks the least-busy free staff. DST-safe: slots inside a daylight-saving gap are never offered, and both transitions keep the right UTC instants in `America/Chicago` and `America/New_York`

## [2.52.0] - 2026-10-29

**A second shared theme — `classic` — proves the theme contract holds for two designs.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`classic` theme** — a serif, centered look for `generic` and `restaurant` verticals; its own tokens, layout and sections render the same `SiteData` contract as `main` — no theme-specific data code
- **Theme choice** — `resolveTheme("classic")` serves it; an unknown key still falls back to `main`

## [2.51.0] - 2026-10-29

**A new tenant walks through the onboarding wizard: name, vertical, site address, and their site is live.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Onboarding wizard** (`/onboarding`) — business name, vertical, subdomain preview, phone and address; the submit creates the tenant, applies the vertical's sample data, creates the site and lands on the dashboard
- **New users go through the wizard** — the dashboard redirects a member-less user to `/onboarding` instead of auto-creating a workspace

## [2.50.0] - 2026-10-29

**A tenant starts from a vertical preset: the right services, staff and words for their business.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Verticals** (`src/verticals/`) — presets for `nail_salon`, `barber`, `restaurant`, `dental`, `generic`: terminology, suggested modules, a default theme, sample services and staff
- **`applyVertical`** — writes the preset once: terminology into settings, suggested modules on, sample rows marked `isSample`
- **Sample data removal** — one click deletes every `isSample` row; the dashboard labels them

## [2.49.0] - 2026-10-29

**A tenant's team — staff the site shows — is the third module through the lifecycle.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`team` module** — staff profiles with photo and bio; a `StaffMember` is not a tenant member — it may never have a login (purged tenant-scoped, exported as JSON, gated by `module.team`)
- **Settings → Team** (`/t/<slug>/team`) — add staff; `team` is a permission resource (`view`/`manage`) managers hold
- **Site team section** — the `main` theme shows staff when the module is on

## [2.48.0] - 2026-10-29

**A tenant's catalog — services with duration and price — is the second module through the lifecycle.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`catalog` module** — categories, services with duration/price, per-service variants; purged tenant-scoped, exported as JSON, gated by `module.catalog` and `catalog.services.max`
- **Settings → Catalog** (`/t/<slug>/catalog`) — add categories and services
- **Site services section** — the `main` theme lists services grouped by category when the module is on

## [2.47.0] - 2026-10-29

**Catalog and team have a schema: services, variants, staff.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — one migration adds five tables.

### Added

- **`ServiceCategory`, `Service`, `ServiceVariant`** — the catalog module's data: categorized services with duration and price, and per-service variants
- **`StaffMember`, `StaffService`** — the team module's staff profiles (a staff member is not a tenant member — it may never have a login) and which services they perform
- **`isSample` flags** on `Service` and `StaffMember` — the rows a vertical preset writes are removable in one click

## [2.46.0] - 2026-10-28

**Tenants attach custom domains to their site.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — one migration adds `Domain`.

### Added

- **Settings → Domains** (`/t/<slug>/settings/domains`): add a custom domain, see the DNS records to create, check verification, make it primary, remove it
- **`DomainProvider` abstraction** (decision 3-A): `VercelDomainProvider` for test/preview, `DigitalOceanDomainProvider` for production, `LocalDomainProvider` for dev — `DOMAIN_PROVIDER` env selects. `resolveHost` resolves an `active` domain to its tenant; the site's canonical origin uses the primary domain
- **`platform.domain.verify` job** — re-checks pending domains against the provider

## [2.45.0] - 2026-10-28

**Every tenant site is crawlable and publishes in under a minute.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Per-host `robots.txt` and `sitemap.xml`** — a site host allows crawling and links its sitemap (canonical origin + published pages); a non-site host disallows or 404s
- **LocalBusiness JSON-LD** — structured data from the same `SiteSettings.profile` the page renders
- **Publish cache** — the site's data is cached under `site:<tenant>` and `saveSiteSettings` `updateTag`s it: an edit is live within a minute

## [2.44.0] - 2026-10-28

**Themes are a registry: `main` is the shared theme every site starts on.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`src/themes/`** — a theme is a manifest (key, kind, verticals, `tokenSchema`) plus React Server Components (`layout`, `pages`, `sections`) that render `SiteData` — never the database or the session. `main` is the shared theme: header/footer shell, hero and hours sections, a home page, fixture data
- **`resolveTheme(themeKey)`** — the tenant's `themeKey` resolves to a theme; an unknown key falls back to `main` and logs, never 500s the site. `/sites/[host]` now renders the theme with the site's settings

## [2.43.0] - 2026-10-28

**Platform upload rules gate every file into R2.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **`upload.types` and `upload.max_mb` platform settings** (Admin → Settings, admin scope): allowed MIME types and the size cap, edited live
- **`/api/upload`** — `sign` checks the rules before the SigV4 PUT URL is signed; `confirm` re-checks them after the bytes land, then writes the `Media` row. An over-limit or disallowed file is refused at both points

## [2.42.0] - 2026-10-28

**Tenants edit their site content from the dashboard.** This is a MINOR: `git pull`, `pnpm install`.

### Added

- **Settings → Site** (`/t/<slug>/settings/site`): company profile (name, tagline, phone, email, address), opening hours (`HH:MM-HH:MM` or closed, per day) and the accent colour — saving creates the `Site` row on first use and audits `site.settings.saved`

## [2.41.0] - 2026-10-28

**A tenant's site has a schema: `Site`, `SiteSettings`, `Page`, `Media`.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — one migration adds the four site tables.

### Added

- **`Site`** — one per tenant: `themeKey`, `tokens` and `sections` (theme-validated JSON), `languages`, `status` (DRAFT / PUBLISHED / MAINTENANCE)
- **`SiteSettings`** — the site content the dashboard edits: company profile, opening hours, appearance
- **`Page`** — tenant pages keyed to the theme's page keys; **`Media`** — uploaded files in R2

## [2.40.0] - 2026-10-28

**Tenant sites have an address: `<slug>.<sites-domain>` resolves to a tenant.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — one migration adds RLS to `ModuleExport` and `ModulePurge`.

### Added

- **Host resolution** (`src/platform/tenancy/host.ts`): `resolveHost(host)` answers the spec/03 table — platform hosts (the app and marketing surface), `<slug>.<sites-domain>` → a tenant's site (active only), everything else → nothing. Reserved slugs (`www`, `app`, `api`, `admin`, `mail`, …) can never be a tenant
- **The proxy rewrites a tenant hostname to `/sites/[host]`** — the URL stays on the tenant's host while the app renders the shared site page
- **`SITES_DOMAIN` env + `DEV_TENANT_HOST_MAP`** — the sites domain is deployment config; `DEV_TENANT_HOST_MAP="slug=host,…"` aliases a dev host for custom-domain testing

## [2.39.0] - 2026-10-28

**Modules get a lifecycle: enable, disable, export, delete.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — one migration adds `ModulePurge` and `ModuleExport`.

### Added

- **Settings → Modules** (`/t/<slug>/settings/modules`): a tenant owner sees every registered module — enabled, disabled with its data kept, or deletion scheduled — and can enable, disable, export, delete (7-day grace, typed-name confirm) and cancel. Staff mirror the same operations from `/platform/modules`
- **Module lifecycle runtime**: `enableModule`/`disableModule` run the manifest's `onEnable`/`onDisable` hooks; `scheduleModulePurge`/`cancelModulePurge`/`runModulePurge` drive the 7-day-grace delete through the `platform.module.purge` job — the only writer of module data deletions — and `requestModuleExport`/`runModuleExport` produce a tenant's own rows as files for 7 days
- **The newsletter module** is the first real one through the lifecycle (`src/modules/newsletter/module.ts`, decision 2-A): its nav item and routes hide when disabled, its `onPurge` deletes only this tenant's rows in batches, its `onExport` is a JSON dump

## [2.38.0] - 2026-10-28

**A failed payment starts a grace period, not a dead end.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — one migration adds `Plan.gracePeriodDays` and `Tenant.graceUntil`.

### Added

- **Grace period on `past_due`**: a payment failure marks the tenant `PAST_DUE` until `now + plan.gracePeriodDays`. Members keep working — an amber banner tells the owner until when — and the first request after it lapses writes the same suspension a staff action would
- **Recovery reactivates**: a subscription that goes `active` again clears the marker; a deleted subscription suspends outright. `gracePeriodDays` is editable per plan on `/platform/plans`

### Fixed

- **A cancelled subscription no longer grants its plan**: `getEntitlements` reads plan features only while Stripe still manages the row — the same live-status list the billing page uses

## [2.37.0] - 2026-10-28

**The signup switches actually gate the public surface.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Changed

- **Pricing shows `PUBLIC` plans only** — an `UNLISTED` or `ARCHIVED` plan never reaches the page
- **`signup.free_plan.enabled` off** removes the free plan from pricing and stops it being assigned at signup; on, a new tenant starts on it without Stripe
- **`signup.require_approval` on** leaves a new tenant in `provisioning` — members see nothing until staff activate it in the console

## [2.36.0] - 2026-10-28

**Free plans, add-ons and setup fees.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — two small migrations (`stripeSubscriptionId` and `planId` go nullable, `Purchase.addOnId` is added).

### Added

- **Free plans need no Stripe**: a plan with no Stripe price assigns directly — the tenant's subscription row is `ACTIVE` with `stripeSubscriptionId: null`, and its feature map resolves like any paid plan's
- **Add-ons**: `AddOn` rows sell through a one-time checkout; the webhook grants a `TenantAddOn` whose feature map folds into the tenant's entitlements. The billing page lists add-ons with Buy/Owned states
- **Setup fee**: a plan's `setupFeeCents` charges as a one-time line item on the tenant's first checkout only — re-subscribing later never charges it again

### Changed

- **No billing read trusts a `userId` anymore**: checkout and webhook metadata carry `tenantId`; billing emails resolve the tenant's owner member. A `Purchase` is now for a plan *or* an add-on

## [2.35.0] - 2026-10-28

**Staff can override one tenant's entitlements.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Added

- **Entitlement overrides on the tenant detail page**: grant, change or revoke any feature for one tenant — a beta flag that survives a platform kill switch (`ignoresSwitch`), a negotiated limit, a revoked capability. Every override needs a written reason, takes an optional expiry after which it quietly stops applying, and leaves an audit row naming the staff member

## [2.34.0] - 2026-10-28

**Plans are editable in the console.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Added

- **`/platform/plans`**: every plan with its visibility, price and live subscriber count. Staff edit the feature map (validated against the feature registry — unknown keys and wrong value kinds refuse the whole save), the setup fee and whether the plan shows on the pricing page; the edit drawer names the tenants a change reaches before it saves. An edited plan changes what its tenants resolve on their next request

## [2.33.0] - 2026-10-28

**Platform settings are editable in the console.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Added

- **`/platform/settings`**: every platform switch in one table — typed settings (display, locale, signup gates, maintenance flags, chatbot provider) with their effective values, plus untyped `feature.*` kill switches and `module.*` states. Each row edits through a JSON field the server re-validates; the change applies without a restart and leaves an audit row
- **New typed switches**: `signup.free_plan.enabled`, `signup.require_approval`, `signup.verticals`, `maintenance.dashboard`, `maintenance.sites`, `chatbot.provider` — all ROOT-scoped with defaults until a deployment overrides them

## [2.32.0] - 2026-10-28

**Metered limits exist now.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Added

- **`consumeLimit(tenant, key, n)`** takes units of a `period` limit with one atomic conditional write, inside the guarded write's transaction — two requests cannot both take the last unit. Unlimited (`null`) consumes nothing; over the cap throws `limit_reached`. First caller wired: the subscribers CSV export counts against `newsletter.exports.monthly`

## [2.31.0] - 2026-10-28

**What a tenant may use is now resolved from its plan, add-ons and staff overrides — not a kit-wide default.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Added

- **The five-layer entitlement resolver**: `getEntitlements(tenantId)` evaluates platform switch, plan feature map, purchased add-ons, unexpired staff overrides and the tenant's own settings in order — a kill switch still wins unless an override marked `ignoresSwitch` says otherwise, and an expired override silently stops applying. `requireFeature` refuses what a tenant may not use

## [2.30.0] - 2026-10-28

**Billing belongs to the tenant now.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Changed

- **Subscriptions and purchases are owned by the tenant**, not the user — one subscription per tenant, enforced by the schema. Checkout, webhooks, the billing page, account deletion and export all read through the tenant; a user with no tenant yet gets one lazily at checkout, like the dashboard does
- **Plans gained the entitlement columns** (`features` map, `visibility`, `setupFeeCents`, `feeModel`) behind the platform entitlements work; the marketing bullet list moved to `marketingFeatures`. A plan may have no Stripe price — the free plan's "checkout" is disabled until signup flow lands

### Added

- **`AddOn`/`TenantAddOn`, `EntitlementOverride`, `UsageCounter`** — the rows the five-layer entitlement resolver reads when it arrives (catalogue, what a tenant holds, staff overrides, metered usage)

## [2.29.0] - 2026-10-28

**Staff can now delete a tenant entirely from the console.** This is a MINOR: `git pull`, `pnpm install` — no migration.

### Added

- **Tenant deletion**: the tenant detail's Delete button asks for the typed slug, cancels the tenant immediately (members lose access on the next request) and queues a `platform.tenant.delete` job that purges every tenant-owned row — subscriptions to the tenant's lists, module states, settings, members, invitations and roles — before removing the tenant itself. Module `onPurge` hooks run first, and the audit trail survives: the deletion request is itself audited

## [2.28.0] - 2026-10-28

**The platform console now has its ops pages.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate`.

### Added

- **Jobs page** (`/platform/jobs`): due, running and failed background work, with per-row retry (failed runs return to the queue with attempts reset) and run-now (queued rows become due immediately)
- **Emails page** (`/platform/emails`): every delivery attempt searchable by tenant, kind and status; the detail view previews the stored body and resends the message through the normal transport — the resend lands as its own delivery row
- **Errors page** (`/platform/errors`): masked error groups with occurrence counts and a resolve action; a recurrence reopens the digest automatically
- All four ops actions write audit rows, and every `EmailMessage` now keeps the rendered body it was sent with

## [2.27.0] - 2026-10-28

**The kit's Projects example is gone from the dashboard, and every account gets its own tenant.** This is a MINOR: `git pull`, `pnpm install`; then run `pnpm exec tsx scripts/backfills/20261028-platform-tenant-per-user.ts --apply` to give existing accounts a tenant (dry-run first without the flag).

### Removed

- **Projects**: the example resource leaves the product surface — the pages, nav entry, home card, onboarding checklist item and editing drawers are gone. The `Project` model and its data stay in the database for now and are still part of the account export

### Added

- **Tenant-per-user backfill** (task 1.12): a dry-run-first script creates a workspace for every account that has none — named after the user, slug from the name, the user as owner — and carries `stripeCustomerId` across. Idempotent, so it is safe to run again after a crash or on new data

## [2.26.0] - 2026-10-28

**Platform staff can open a tenant's dashboard as its owner.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` — two nullable columns join `Session`.

### Added

- **Tenant impersonation** (task 1.11): from a tenant's detail page, support and admin staff open its dashboard as the owner. A written reason is required, shown on the banner the whole time, recorded on the audit row at start and stop, and attached to every mutation made while impersonating — those rows name the staff member, not the owner. The session ends itself after 60 minutes or immediately with "End impersonation", which lands back on the console. Suspended and canceled tenants cannot be impersonated

## [2.25.0] - 2026-10-28

**Platform staff get their own console at `/platform`.** This is a MINOR: `git pull`, `pnpm install`; no migration.

### Added

- **Platform console** (task 1.10): `/platform` opens only to users holding a `platformRole` — checked on the User row every request, so a revoked role closes the console at once; everyone else lands on their dashboard. The Tenants page lists every workspace with search and a status filter, and "New tenant" creates a workspace for an existing account (that account becomes the owner)
- **Tenant detail and suspension**: a tenant's page shows its identity, status and members; staff can suspend it — a written reason is required and audited — and reactivate it. A suspended or canceled tenant answers 404 to its members on their next request, in the proxy before the page even streams, so nobody learns it exists by probing

## [2.24.0] - 2026-10-28

**Every important change now leaves an audit row.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (a new `AuditLog` table).

### Added

- **Audit log** (task 1.9): a platform-private `AuditLog` table and `audit(ctx, event)`, which writes exactly one row per audited change — actor, tenant, action, target, data and reason. Inviting, changing or removing members, suspending or reactivating them, withdrawing an invitation, creating, editing or deleting a tenant role, and every Switch As start and stop now write rows; a bulk action writes one row per member or role it changed. Tenant suspension and impersonation wire in with the platform console

## [2.23.0] - 2026-10-28

**Invite people to a workspace by email, and build roles from grouped permissions.** This is a MINOR: `git pull`, `pnpm install`; no migration.

### Added

- **Invitation emails** (task 1.8): inviting from Members sends an email with a link to `/invite/<id>`. Signed out, the page asks to sign in or create an account with the invited address and brings the person back afterwards; signed in, they accept or decline. Invitations last seven days
- Clear messages when an address is already a member or already invited; an address whose earlier invitation expired, was declined or withdrawn can be invited again
- **Roles page** (task 1.8b): permissions are ticked in groups (workspace, website, bookings and customers, catalog and sales, marketing, reports), with readable names in both languages. A workspace holds up to 10 custom roles for now
- Custom roles can be switched off for the whole platform with the `feature.roles.custom` platform switch: the roles page and its menu entry disappear and saving is refused

### Changed

- Inviting follows the role's permissions (`members.invite` or `members.manage`), so a custom role can be allowed to invite. Only an owner can make someone an owner or change an owner's role

### Fixed

- **A workspace with a custom role could no longer invite or change roles**: the role's permissions were read back in a form the sign-in library did not expect, and every permission check failed

## [2.22.0] - 2026-10-28

**Each tenant's dashboard has its own address, `/t/<slug>`, and a switcher.** This is a MINOR: `git pull`, `pnpm install`; no migration.

### Changed

- **The dashboard moved to `/t/<slug>/...`** (task 1.7): projects, members, roles, newsletter, billing and settings now live under the tenant's address. `/dashboard` and every old `/dashboard/...` link still work: they redirect to the same page in the tenant opened last (else the first one joined). Account pages stay at `/dashboard/account`
- **Tenant switcher** at the top of the sidebar, listing every workspace you belong to
- Opening a tenant you do not belong to answers a real 404, so a stranger cannot tell the tenant exists

### Fixed

- A new account's first visit to the dashboard could fail with "Organization already exists" when two requests created its tenant at once

## [2.21.0] - 2026-10-28

**Phase 1 begins: database roles, and custom roles work again.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (row-level security on `TenantSetting`, a new `TenantModule` table); `pnpm db:roles` is a one-time step when you split database users.

### Added

- **`pnpm db:roles`** (task 1.1): creates the `app` (RLS enforced) and `platform` (bypasses RLS) database roles with their grants, safely re-runnable. New optional variables `DATABASE_URL_PLATFORM` and `DATABASE_URL_MIGRATE`; unset, `DATABASE_URL` keeps doing every job. Migrations, `pnpm db:reset`, backups and the admin panel's migrate use `DATABASE_URL_MIGRATE` when it is set. Steps in spec/14, "Database roles"
- `src/platform/db.ts`, the platform client for cross-tenant reads
- **`tenantDb(ctx, fn)`**, the scoped client for tenant-owned data (task 1.5): one transaction with `app.tenant_id` set, every collection narrowed to the tenant. `TenantSetting` now has row-level security (migration `platform_tenant_setting_rls`: run `pnpm db:migrate`)
- **Module enablement per tenant** (task 1.6): a `TenantModule` table (migration `platform_tenant_modules`) and `isModuleActive`, `enableModule`, `disableModule`, `requireModule`, `requireModuleRoute`. A module is active when it is registered, switched on for the platform (`module.<key>`), enabled by the tenant and its dependencies are active; a module others depend on cannot be disabled

### Fixed

- **Custom roles can be created and edited again**: Better Auth's organization plugin checks permissions of its own (custom roles, invitations, members) that the tenant roles did not hold, so saving a custom role failed even for the owner. They are now derived from the role's permissions (task 1.3)

## [2.20.0] - 2026-10-27

**The public site speaks Vietnamese, and ROOT can back up and migrate the database from the admin panel.** This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (three new tables: `ErrorReport`, `Job`, `EmailMessage`).

### Added

- **`/vi`**: every public page in Vietnamese, under a `/vi` prefix; English stays unprefixed (phase 0, task 0.12)
- **Admin → Database** (ROOT only, [ADR 0023](spec/adr/0023-database-backup-and-migrate-from-admin.md)): apply pending migrations behind a typed confirmation, a lock and an automatic backup first; take data-only backups (`.sql.gz`) into R2 and download them through a five-minute link. Restoring is done from a terminal, following the ADR. Needs `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_ACCOUNT_ID`; a half-set group now stops the boot
- `pnpm check:translations`, which runs the message-file tests
- **The private area follows the browser's language** until you pick one: the order is the language picked on this device, your saved preference, your browser's languages, then the workspace default (task 0.13)
- **Emails to members arrive in their language**: sign-in links, password resets, welcome, billing and cancellation emails use the language saved in Account → Preferences

- **Every request carries an id** (`x-request-id`, uuid v7, kept when an upstream proxy already set a valid one), shown on the response; an action that fails with an internal error returns it, so a person reporting the error can quote it (task 0.14)
- **`ErrorReport`**: every `log.error` and every uncaught request error is grouped by digest (surface, error name, first stack frame) in a new table, with a masked message, the request id and the surface. Migration `platform_error_reports`: run `pnpm db:migrate`
- **Sentry**, off unless `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` is set; nothing about the person or the request is sent ([ADR 0017](spec/adr/0017-sentry-for-error-tracking.md), now accepted)
- `/api/health/live` for load checks
- **Background jobs** ([ADR 0008](spec/adr/0008-jobs-table-before-a-queue.md), task 0.15): a `Job` table (migration `platform_jobs`) and `/api/cron`, which claims due jobs with `FOR UPDATE SKIP LOCKED`, retries failures with backoff (1, 2, 4… minutes, up to an hour) and leaves them `FAILED` with a masked `lastError` after the last attempt. Recurring jobs declare a cron expression; the first one prunes `ErrorReport` groups older than 30 days. Vercel Cron calls it daily; point a one-minute pinger at it in production (spec/14). It needs `CRON_SECRET`
- **`EmailMessage`, the delivery record** (task 0.16, migration `platform_email_messages`): every `sendEmail()` call leaves one row with the recipient, subject, provider and outcome (`SENT` with the provider's message id, `REFUSED` or `FAILED` with a masked error), including when the send throws. Records older than a year are pruned daily. `sendEmail()` takes an optional `tenantId` for the row

### Changed

- `/api/health` answers 503 with `"code": "database_unreachable"` when the database cannot be asked, instead of 200
- `log.error` returns a promise: await it where the process may end right after
- `toDirectUrl` moved to `src/lib/database-url.ts`; `scripts/db-reset-guard.mjs` re-exports it

## [2.19.0] - 2026-10-27

**A settings change shows everywhere at once, step 2 of spec/adr/0022.** This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Changed

- Admin Settings now uses the same content width as Account pages, and the Access switch sits directly in the card content like the notification preferences.
- The migrations list uses the shared table with search, sorting and pagination.
- Admin → Database → Migrations now lists every migration in the build and marks each one as applied, pending or unknown.
- Database migrations and backups now have separate pages under Admin → Database. The existing `/admin/database` address opens Migrations.
- Platform, workspace and personal settings are cached on the server with `"use cache"`, each under its own tag (one per workspace, one per person, one for the platform), and saving expires that tag. A change used to reach other server instances only after up to 30 seconds; now the next request reads it. The cache also refreshes on its own every minute as a backstop for hosts that do not share tag expiry. If you customised: anything else that writes `PlatformSwitch`, `TenantSetting` or `UserSetting` must call `updateTag` with the tag from `src/platform/settings/cache-tags.ts`
- The platform settings are no longer read at request time only: the public pages can now include them in a prerendered shell (used from step 3)

## [2.18.0] - 2026-10-27

**Cache Components and Partial Prefetching are on, step 1 of spec/adr/0022.** Nothing looks different yet: every page still renders on request, as before. This step clears what the new rendering model refuses, so the next steps can make pages instant one at a time. This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Changed

- `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`. Every page and layout carries `export const instant = false` until its route is converted. If you customised: add the same line to a new page, and run `pnpm build` after rendering changes, since that is where the new errors show
- Server Components translate with `await getTranslations()` instead of the `useTranslations` hook (the landing sections, About, Contact, Changelog, the sign-in check-your-email page)
- The copyright year comes from `currentYear()` (`src/lib/current-year.ts`), cached daily, instead of reading the clock during render
- Database reads that run before a page has read any request (platform settings, the landing's plans, the development setup check) wait for the request with `io()`
- `/api/health` and the demo reset call `connection()` instead of `export const dynamic = "force-dynamic"`

### Fixed

- The privacy, terms and cookie pages showed today's date as "Last updated" on every visit. They now show a fixed date; update it when you change the text

## [2.17.0] - 2026-10-27

**Typed links, a real error page, and a softer page load.** This release puts features of the installed Next.js 16.4 to work. It is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **Typed routes** (`typedRoutes`): every `href`, `redirect()` and `router.push()` is checked against the pages that exist, so a typo or a deleted page fails `pnpm typecheck` instead of a click. `pnpm typecheck` now runs `next typegen` first. If you customised: type your own route constants as `Route` from `next`, and link to the home page through `HOME` from `@/config/site`
- **An error page inside the app**: a page under `/dashboard` or `/admin` that fails shows "Something went wrong" in the same block as the empty states, with "Try again" (it reloads only that page) and a reference that matches the server log. The sidebar and header stay. Before this, an error replaced the whole screen with the framework's default page
- **The page skeleton fades out** as the content arrives (React view transitions), instead of vanishing. Off when the system asks for reduced motion

## [2.16.0] - 2026-10-27

**Empty lists are a block of their own, and every page loads as a skeleton.** This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **`PageSkeleton`** (`src/components/layout/page-skeleton.tsx`): every page under `/dashboard` and `/admin` now has its own `loading.tsx` showing a skeleton in the page's shape (a list, a form or cards) instead of dimming the screen. Settings and account pages keep their title and tabs on screen and skeleton only the content. A test fails when a page folder has no skeleton

### Changed

- **An empty list is no longer drawn as a table**: no header row, no pagination, one dashed block with an icon, a sentence and the next step. With a search or filter active, the search box stays above the "No results" block so it can be changed
- The dimmed overlay with the logo now shows only on the first entry into the app; a link to a page that has no skeleton still falls back to it

## [2.15.0] - 2026-10-27

**Empty lists explain themselves.** Every empty block now has the same shape: an icon, a title, one sentence and, where there is one, the next step. This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **`EmptyState`** (`src/components/layout/empty-state.tsx`) on the stock shadcn `Empty`: the one way to show an empty block
- **"No results" with "Clear filters"**: when a search or filter leaves a table empty, it says so and offers to clear them, instead of showing the list's "nothing yet" message

### Changed

- `DataTable` takes `empty` (`{ icon, title, description?, action? }`) in place of `emptyMessage`. Projects offers "New project" and Members offers "Invite member" right in the empty table. If you customised: pass `empty` to your own tables
- The rule for loading is written down: a skeleton for a page or section, a spinner inside a field only when that field fetches its own data, and on submit the spinner in the button with the fields locked

## [2.14.0] - 2026-10-27

**Long lists can be searched, loading fields say so, and the language files agree.** This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **`OptionSelect`** (`src/components/form/option-select.tsx`): the one way to pick from a list. Up to eight options it is the standard select; from nine on it has a search box (`SearchableSelect`), so the time zone, the roles of a large workspace and long filters are found by typing. Used by every settings form, every table filter and every drawer
- **Loading states in fields**: a select still loading its options shows a spinner, and the table search shows one while new rows arrive
- **Time zones are found by today's name**: the runtime still lists a few under old names (`Asia/Saigon`), so the list shows `Asia/Ho_Chi_Minh (Asia/Saigon)` and a search for "ho chi minh" finds it
- **A test that every language file has exactly the keys of `en.json`**

### Changed

- **`vi.json` is complete again**: the 170 strings added since the last translation pass are translated into Vietnamese, the 10 that nothing reads any more are gone, and its keys follow the same order as `en.json`
- `SearchableSelect` moved from `src/components/ui/` to `src/components/form/`: `ui/` holds only stock shadcn components (spec/adr/0021)

## [2.13.0] - 2026-10-27

**Each workspace sets its own language, time and display.** Settings gains General, Localization and Display tabs for the workspace: its name and slug, its language, time zone and date and time format, and the list page size. A workspace's values override the platform's for everyone in it; the public site keeps the platform's. This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (one new table, `TenantSetting`), then restart the server.

### Added

- **Settings → General, Localization, Display**, editable by members whose role can manage settings and read-only for the rest. Values are stored per workspace in `TenantSetting` (one row per key, `src/platform/settings/tenant-store.ts`); `TENANT_SETTING_KEYS` in the settings registry lists what a workspace may set
- **Account → Preferences and Notifications.** Each person can set their own language, time zone and date and time format (stored in the new `UserSetting` table, over their workspace's values, which are over the platform's) and their theme, and turn product-update and tip emails off; security and billing emails are always sent. Preferences moved here from Settings, which now opens on the workspace's General tab. Run `pnpm db:migrate` for the `UserSetting` table too
- **Account → Notifications matches Activity:** uses the same single card with a title and description; notification rows inside have dividers without an extra bordered panel or horizontal row padding
- Saving a notification preference shows a spinner beside its switch while the update is pending
- Added `SearchableSelect` for long option lists and remote API search, with an in-field spinner and loading state
- **Select menus open below their trigger** so the selected control stays visible; long or database-backed options use searchable, API-loaded choices per the UI rules
- **Members page manages people properly**: suspend and reactivate members (owners and yourself are protected; a suspended member keeps the seat but is granted nothing), see when each member was last active, and revoke pending invitations. `Member` gains `status`
- **Each workspace has its own newsletter list** at `/dashboard/newsletter`: search, filter by status, export to CSV, unsubscribe, and add an address (it joins once the person confirms by email). `NewsletterSubscriber` gains `tenantId` (null is the platform's list, which `/admin/newsletter` and the public signup keep to) and an address is unique per list. A new `newsletter` permission (view, manage) is granted to owners and managers. Run `pnpm db:migrate`
- Every signed-in page formats dates, picks its language and sizes its lists from the workspace's settings (`getViewerSettings()`), falling back to the platform's

## [2.12.0] - 2026-10-27

**A flat UI, drawers that fit what they hold, and a language switch in the header.** No shadows anywhere, a quieter app header and sidebar edge, edit drawers that open at the width their form needs with fields that keep their focus ring, and a shorter Security page. This is a MINOR: `git pull`. Nothing to migrate.

### Added

- **Language switch in the app header**, next to the theme switch. The choice is kept per browser in the `app_locale` cookie for a year and outranks the platform default (`locale.app`), which now only applies to people who have not picked one. The public site still takes its language from the URL

### Changed

- **A flat UI: no shadows anywhere.** Surfaces are told apart by a border or a ring. The Tailwind shadow scale is flattened in `globals.css`, so the stock components follow without being restyled, and a test fails on a `shadow-*` class outside `src/components/ui/`. The `shadow-soft`, `shadow-soft-lg` and `shadow-glow` tokens are gone; the signed-in page gets a border against the sidebar instead
- **Drawers open at the width their content needs**: `FormDrawer` takes `size` (`sm`, `md`, `lg`, `xl`) and is full width on a phone. The header and the buttons stay put while the fields scroll, the buttons sit side by side at the bottom right, and a form can lay its fields out in columns (member invitation: email and role on one line; role permissions: two columns of resources)
- The app header no longer draws a divider between the sidebar button and the breadcrumbs, and the edge of the sidebar no longer draws a line on hover (clicking it still folds the sidebar)
- **Every button and menu item has an icon, and menus are grouped.** A row's actions menu opens with an "Actions" label, keeps destructive items last in their own red group, and `RowAction` / `BulkAction` now require `icon`, so a table action without one fails the type check. Save, Cancel, delete, download, sign-in and call-to-action buttons all carry a lucide icon, on the marketing site too (navbar, hero, pricing, the contact, waitlist and footer forms, the mobile menu)
- **Account and Settings are two pages.** Account (`/dashboard/account`) holds Profile, Security, Backup and Activity (was Logs); Settings (`/dashboard/settings`) is now Preferences: language and theme for this browser. Both are in the sidebar and the avatar menu. The old `/dashboard/settings/security`, `/backup` and `/logs` URLs redirect, query string included, so links in emails already sent keep working. Server actions redirect with `accountHref()` from `src/lib/settings-pages.ts`
- **Settings, Security: less to read, one size of control.** Every button is the default size and every field the same width, the email and password forms put the field and its button on one line, the explanations are cut to one short line each, and turning two-factor off sits next to its status

### Fixed

- **Focus rings in drawers are no longer cut off**: the fields sat flush against the scrolling edge, which clipped the ring
- A drawer's width setting had no effect: the Sheet's own `max-w-sm` outranked it
- The page next to the sidebar now has all four corners rounded: the sticky header covered the top two
- The sign-in page's demo and dev buttons used emoji for icons; they use lucide icons like every other button

## [2.11.0] - 2026-10-27

**Standard shadcn/ui, and the Studio Admin app shell.** The UI components are stock shadcn (the "radix-nova" style), and the dashboard, admin panel and sign-in pages use the layout of Studio Admin, an MIT-licensed shadcn dashboard (credited in `NOTICE`). This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **App sidebar** (shadcn `Sidebar`): grouped navigation, collapses to icons on desktop, opens as a sheet on a phone, remembers its state in a cookie, and keeps the signed-in user and the account menu at the bottom
- **Search** in the header: go to any page by name, Cmd/Ctrl+K
- **Split-screen sign-in pages**: the form on the left, the deployment's name and tagline on a brand panel on the right from large screens up
- `NOTICE` with Studio Admin's MIT license; spec/adr/0021 with the plan and its status

### Changed

- **`src/components/ui/` is stock shadcn/ui**, copied from Studio Admin, with its built-in labels translated. Button and field sizes are shadcn's (default 32px), the radius is shadcn's standard, and busy buttons show a spinner. The marketing site keeps its own two button extensions (`gradient`, `xl`)
- The admin panel and the dashboard share one frame (`AppShell`), so they can no longer drift apart

### Removed

- The hand-made sidebar, mobile menu, collapse toggle and header user menu, the field size scale (`field.ts`), and the `loading` and `error` props of Button and Input

## [2.10.0] - 2026-10-27

**One way to build every screen.** Every list is a data table with search, filters, sorting, pagination, bulk actions and a row menu; create and edit happen in a drawer; fields share one size scale; section sub-pages use vertical tabs; and ROOT has a settings page for the whole system. This is a MINOR: `git pull`, `pnpm install`, `pnpm db:migrate` (one new table, `PlatformSwitch`), then restart the server.

### Added

- **`DataTable`** (`src/components/data-table/`, TanStack Table v9): search, filters, sort and page size in the URL and applied on the server, a checkbox column with bulk actions, a row actions menu, confirmation before anything destructive. Used by Admin → Users, Admin → Newsletter, Projects, Members, Roles and the invoices on Billing
- **Edit in a drawer**: `FormDrawer` (Sheet + React Hook Form + Zod + a TanStack Query mutation) for users, projects, member invitations and roles, and role permissions
- **Admin → Settings** (`PlatformSwitch`, spec/04-entitlements.md): rows per page, date and time format and time zone for every page; and, ROOT only, the language of the dashboard and admin panel (English or Vietnamese) and whether sign-ups are open. Closed sign-ups refuse the email form and every OAuth provider
- **Admin → Users** and **Admin → Newsletter** as their own pages: edit a name, change roles in bulk (ROOT), Switch As from the row menu, export the selected rows, unsubscribe in bulk
- **Field size scale** (`src/components/ui/field.ts`: `sm`, `md`, `lg`) shared by Input, Textarea, Select and the new `NativeSelect`, and matched by Button; `SectionNav` for vertical tabs
- **TanStack Query, Zustand, Prettier** (spec/adr/0020-application-stack.md: one library per job). `pnpm format` formats; `pnpm lint` now also checks formatting
- Tests that fail on a field sized by hand, a bare `<select>`, a dotted message key, and a test file outside `tests/`

### Changed

- **The repository is formatted by Prettier**, once, in this release
- **Selects no longer put their arrow against the border**; fields beside buttons are the same height everywhere, the sign-in pages included
- **Settings uses vertical tabs**, as will every section with sub-pages
- **Admin → Overview** keeps the numbers and the revenue chart; the lists moved to their own pages
- **Dates everywhere follow the platform time zone and format**, and the dev Prisma client is rebuilt automatically after a schema change

### Removed

- The users table and newsletter list from the admin overview, the inline "Make admin" and "Switch as" buttons (now in the row menu), the projects dialog and search box (now the table and its drawer)

## [2.9.1] - 2026-10-27

**Every page answered 500 after the organization plugin landed.** Better Auth writes `Session.activeOrganizationId` and the database had no such column. This is a PATCH: `git pull`, `pnpm install`, `pnpm db:migrate`, then restart the server (Better Auth checks the schema once, at startup).

### Fixed

- **`Session.activeOrganizationId`** added to the contract, with migration `kit_session_active_organization` (one nullable column)
- **A test compares the columns Better Auth writes with the contract** (`tests/unit/auth-schema.test.ts`), so a plugin field the contract lacks fails the suite instead of every page

## [2.9.0] - 2026-10-26

**Settings is a section of its own, and every test lives in `tests/`.** Settings opens as a page, not a modal, with four sub-pages: General, Security, Backup and Logs. This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **Settings → Backup**: download everything the app holds about you as JSON (`/api/account/export`), built from an allow-list that never includes passwords, tokens, two-factor secrets or backup codes
- **Settings → Logs**: account activity, newest first: account creation, sign-in methods added, two-factor authentication, and every session on record with its device and IP, including sessions opened with Switch As
- **Settings → Security**: sign-in methods, email address, password, two-factor authentication and active sessions, moved from the single settings page

### Changed

- **`/dashboard/settings` is always a full page** with its own sub-navigation; the intercepting modal is gone. Account actions redirect to the page their form lives on (`/dashboard/settings/security` for sign-in, password, email, 2FA and sessions)
- **Tests moved to `tests/`** (spec/adr/0016-tests-live-in-tests.md): unit tests in `tests/unit/` mirroring `src/`, Playwright in `tests/e2e/`, shared doubles in `tests/helpers/`. A test file under `src/` or `scripts/` now fails the suite

### Removed

- The settings modal (`@modal` slot, `RouteModal`, `SettingsView`)

## [2.8.0] - 2026-10-26

**One way to reach the database.** Every query now goes through the Prisma 8 client, `db8`, and the Prisma 7-shaped `@/lib/prisma` layer on top of it is gone. Nothing changes for visitors and there is nothing to migrate: `git pull`, `pnpm install`.

### Added

- **`@/lib/timestamps`**: `toDate`, `toTs` and `nowTs`, the one place a `TimestampString` column becomes a `Date` and back. Reading one with `new Date(value)` takes it as local time; these read it as UTC
- **`uniqueIndexKey()` in `@/lib/db8`**: names a unique key for `upsert`, because the kit's unique keys are unique indexes and Prisma 8 only types unique constraints there
- **`createDb8Mock()` in `tests/helpers/db8-mock.ts`**: the stand-in for `db8` that the unit tests share

### Changed

- **Every page, action, route, seed and test uses `db8.orm.public.<Model>` directly**, including the Stripe webhook, checkout, the admin panel and the demo seed. `seedDemoData()` and `grantRootFromConfig()` no longer take a client argument
- **The first-run setup notice recognises Prisma 8's errors**: it still matched the Prisma 7 codes `P1000`, `P1001` and `P1013`, which Prisma 8 never throws, so an unreachable database was reported as missing migrations

### Removed

- `src/lib/prisma.ts`. Lint now rejects `@/lib/prisma` everywhere

### If you customised code that imports `@/lib/prisma`

Rewrite those calls on `db8`: `prisma.user.findUnique({ where: { id } })` becomes `db8.orm.public.User.where({ id }).first()`, `count` becomes `.aggregate((a) => ({ n: a.count() }))`, `updateMany` becomes `.updateAndCount(...)`. Timestamps come back as text: wrap them in `toDate` before formatting or comparing, and write them with `toTs`.

## [2.7.0] - 2026-10-26

**Switch As for ROOT, and one set of button styles.** ROOT can open a session as any user or admin to see the app as they do, with a banner and "Switch back". This is a MINOR with one step: `git pull`, `pnpm install`, `pnpm db:migrate` (the migration adds one nullable column).

### Added

- **Switch As** (spec/adr/0015-switch-as.md): a "Switch as" button on each user row of the admin panel, for ROOT only and never onto another ROOT. The session lasts at most an hour, a banner stays on every signed-in screen while it is open, and "Switch back" restores the ROOT session. Migration `kit_session_switch_as` adds `Session.switchedBy`
- **`Button` sizes `xs`, `icon`, `icon-lg` and variants `outline-primary`, `outline-destructive`**: the small form buttons and icon buttons that were restyled by hand now share one definition
- **`components.json`** for the shadcn CLI, so `npx shadcn add <component>` drops new primitives into `src/components/ui` instead of being pasted by hand
- **`PendingButton` takes `variant`/`size`** backed by `buttonVariants`, so submit buttons inside forms get the kit styles instead of a hand-copied `className`

### Changed

- **Hand-rolled controls replaced by kit components**: the admin user search (`Input`/`Button`), the two raw `<textarea>`s (`Textarea`), and the icon buttons in the theme toggle, sidebar collapse, nav menus, footer and back-to-top (`Button` ghost/outline with the icon sizes). Small visual diffs follow on purpose: icon buttons are now circular with one hover color, and the auth submit buttons are `size="lg"` (was a stray `h-12`).

## [2.6.0] - 2026-10-26

🗄️ **Prisma 8 only.** Prisma 7 is gone from the project: no `schema.prisma`, no `prisma7` CLI, no `_prisma_migrations`. Migrations are Prisma 8 packages in `migrations/app`, starting from a baseline that matches the Prisma 7 schema exactly. This is a MINOR with one step: `git pull`, `pnpm install`, then `pnpm db:adopt` once per database Prisma 7 built (`pnpm check:deploy` says whether one needs it).

### Added

- **Prisma 8 migrations** in `migrations/app`: `kit_baseline` (the schema the Prisma 7 migrations produced, including the `TwoFactor.updatedAt` default) and `kit_plan_features_required` (`Plan.features` becomes required, with a backfill of any NULL to `{}` first)
- **`pnpm db:adopt`**: signs a database Prisma 7 built at the baseline (Prisma verifies the schema first and refuses a mismatch), applies the migrations after it and verifies; `--drop-legacy-table` removes `_prisma_migrations`
- **Database scripts**: `db:emit`, `db:plan`, `db:migrate`, `db:status`, `db:verify`, next to `db:reset` and `db:reset:demo`
- **ROOT role** above ADMIN (spec/adr/0014-root-role.md): only ROOT changes roles (now both "Make Admin" and "Remove Admin"), ROOT is granted only by `ROOT_EMAILS` through the seeds, and the last ROOT cannot delete their account. Every role check goes through `src/lib/roles.ts`
- **One way to make ids** (spec/adr/0013-identifier-strategy.md): `src/lib/ids.ts` with CUID2, UUID v7 and NanoID codes on the same `uniku` generators Prisma 8 uses; lint rejects other generators and `crypto.randomUUID()`
- **Project memory for every agent**: `.agents/memory/lessons.md`, read at the start of each task and extended whenever an error is fixed
- **CI** emits the contract and fails on stale artefacts, checks the migration graph, and applies every migration to a fresh Postgres and verifies it against the contract in strict mode

### Changed

- **`/api/health` and `pnpm check:deploy`** compare the database's Prisma 8 marker with the contract hash and count the missing migrations on the graph; `check:deploy` recognises a database Prisma 7 built and points at `db:adopt`
- **`pnpm db:reset`** always applies the migrations (`prisma db migrate`) and uses Neon's direct host instead of the pooler
- **The `TwoFactor.updatedAt` default** is declared in the contract, so the contract and the database agree

### Removed

- Parent-relative imports (`../`): lint enforces `@/` (and `#src/` in plain Node scripts); the Prisma 8 artefacts moved to `src/generated/prisma8` for it
- `@prisma/prisma7`, `prisma7.config.ts`, `prisma/schema.prisma`, the Prisma 7 migrations folder (kept in git history) and `ts-node`
- New code can no longer import `@prisma/client`, `@prisma/adapter-pg`, `@prisma/prisma7` (lint), nor `@/lib/prisma` from `src/platform`, `src/modules`, `src/themes`, `src/verticals` and `tests`

## [2.5.0] - 2026-10-26

🔧 **The fork becomes lessGAP App.** Rebranded, moved to pnpm, the seed scripts fixed and the demo seed grows a real admin account — all on top of the upstream 2.4.0 this fork started from. This is a MINOR: `git pull`, `pnpm install`. Nothing to migrate.

### Added

- **A real credential admin in the demo seed**: `pnpm db:seed:demo` now creates `baonguyenyam@gmail.com` (password `adminadmin`, `ADMIN` role) next to the shared one-click demo accounts, so email + password sign-in works on the demo too

### Changed

- **Rebranded to lessGAP App**: `NEXT_PUBLIC_BRAND_NAME`, wordmark accent and contact email set in `.env`, the "Built with" badge disabled via `NEXT_PUBLIC_REMOVE_BRANDING`, `package.json` renamed to `lessgap-starter-kit`, and the developer-docs link in the setup guide now points at docs.lessgap.app
- **Package manager is pnpm**: `packageManager` in `package.json`, the allowed build scripts in `pnpm-workspace.yaml`, and the commands in the README updated to match
- **Latest compatible dependencies**: `@hookform/resolvers` 6, `@stripe/stripe-js` 10, `stripe` 23 (API version `2026-09-30.endive`), ESLint 10
- **Prisma ORM 8 (`8.0.0-rc.27`) now owns data access.** The runtime is `@prisma/orm-postgres` with the contract in `prisma/contract.prisma` (emitted to `generated/prisma8/`), the client lives in `src/lib/db8.ts`, and `src/lib/prisma.ts` is a facade that keeps the `prisma.<model>.<verb>` call shape — including `Date` inputs/outputs, `include`/`select`, generated ids and `updatedAt` — so routes and actions did not have to be rewritten. Because `@better-auth/prisma-adapter` only supports Prisma 5–7, Better Auth moved to `@better-auth/kysely-adapter` on its own `pg` pool (`src/lib/kysely.ts`), with timestamp parsing pinned to UTC so both layers agree on instants. Migrations stay in `prisma/migrations/` and are applied by the Prisma 7 CLI (`prisma7.config.ts`, `@prisma/prisma7`); `pnpm db:reset` rebuilds a development database. New migration `20261026183000_twofactor_updatedat_default` gives `TwoFactor.updatedAt` a database default because Better Auth writes that table without touching timestamps. Removed: `@prisma/client`, `@prisma/adapter-pg`, `@better-auth/prisma-adapter`

### Removed

- **The blog and the docs**: both move to dedicated Astro sites at blog.lessgap.app and docs.lessgap.app, so the routes, components, `content/`, `docs/` and the MDX/Shiki/markdown pipeline that only they used are gone. The changelog stays, rendered from `CHANGELOG.md` (or `content/changelog.md` in a clone)
- **The `it` locale**: it existed to translate the docs; with the docs gone it is removed from `routing.locales`

### Fixed

- **`pnpm db:seed` and `pnpm db:seed:demo` run the seed again**: the scripts wrapped `ts-node` in `dotenv -e`, a flag dotenv-cli 11 removed, so they exited before the seed ever ran. The seed files now load `.env.local` then `.env` themselves, the same order as `prisma.config.ts`, and `dotenv-cli` is gone
- **The version-consistency test reads a lockfile that exists**: it looked for `package-lock.json`, which a pnpm install never writes. The check now runs only when that file exists — `pnpm-lock.yaml` does not record the project version

---

## [2.4.0] - 2026-10-24

🧭 **Breadcrumbs in the dashboard header, and your account behind the avatar, top right.** The sidebar keeps only navigation; where you are and who you are move up into the header, where most apps keep them. This is a MINOR: `git pull`, `npm install`. Nothing to migrate, and the one new environment variable is optional.

### Added

- **Breadcrumbs in the header of the dashboard and the admin**, next to the button that folds the sidebar: *Dashboard › Projects › Website*, with the area's icon in front. They are built from the address, so a new page gets its crumb from a label in `labels` in its layout (`src/app/(dashboard)/layout.tsx`, `src/app/(admin)/layout.tsx`), without being listed anywhere else. A page with a name of its own, like a project, gives it with `<BreadcrumbName name={...} />`; until it does, the crumb is left out rather than shown as an id. The trail at the top of the project page moved up into the header
- **The account menu, top right**, behind the avatar, on every screen size: Settings, Billing and Sign out, with your name and email at the top of it. They leave the top of the sidebar
- **Your product's name under the footer of the public pages, if you want it**: large and faint, its lower edge cut by the page, your `siteConfig.name`. Off by default, so nothing changes until you set `NEXT_PUBLIC_SHOW_FOOTER_WORDMARK="true"`, see [Configuration](./docs/configuration.md). Decoration only, hidden from screen readers

### Changed

- **The Admin Panel sits at the bottom of the sidebar**, under a rule, apart from the entries you use every day, with **Developer docs** under it: the kit's manual on openstarterkit.dev, in a new tab, in the phone menu too. Only while developing and in a demo (`DEMO_MODE`), never in your production app, whose users would find setup instructions instead of help
- **"Demo" instead of "Sign in" when the link goes to the demo.** With `NEXT_PUBLIC_DEMO_URL` set, the navbar link points at your demo, where no visitor has an account of their own, so it now says so. Without it nothing changes
- **"Pricing" in the footer opens `/pricing`**, not the pricing section of the home page. The top menu still scrolls to the section. A link from every page is what tells search engines the pricing page matters, and a link to a section only counts for the home
- **No rule above the "Built with" badge** at the bottom of the dashboard, so removing the badge no longer leaves an empty strip with a line over it
- **Dependencies**: `next` and `eslint-config-next` 16.4.3, `lucide-react` 1.61, `react-hook-form` 7.91, `dotenv` 18.0.9, and `fast-uri` 3.1.9 under `@hookform/resolvers`, for four moderate advisories on URI parsing. Production dependencies audit at zero

### Fixed

- **The Google and GitHub buttons show only when their keys are set.** On a fresh clone they were always there, and a click ended on Better Auth's `CLIENT_ID_AND_SECRET_REQUIRED`: the error overlay in development, an error page in production. Now the login page and Settings show a provider only with both its keys, and `src/auth.ts` registers only those, the same way the magic link already hides without email. A provider you already connected stays in Settings, to be disconnected. One key set without the other still stops the boot, as before
- **Deleting the account of the last administrator no longer cancels their subscription first.** The refusal came after the cancel at Stripe, so the account stayed and its subscription was gone. The last-admin check now runs before Stripe is touched

## [2.3.7] - 2026-10-20

🔐 **Next.js 16.4.2, for the security advisories of October 14.** One of them lets crafted requests tie up the CPU of any App Router app with a Server Action, and the kit has several: update now. The other two, remote code execution through `use cache` functions and through SVG image optimization, do not reach the kit as it ships (it has no `use cache`, and `sharp` was already at the fixed 0.35.5), but they reach an app that adds either. This is a PATCH: `git pull`, `npm install`. Nothing to migrate and nothing to configure.

### Security

- **`next` and `eslint-config-next` 16.4.2**, which carries the fixes of 16.4.1 for [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r) (denial of service through Server Actions), [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) and [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)

### Changed

- **`better-auth` and `@better-auth/prisma-adapter` 1.7.12**: cookie attributes aligned with RFC 6265bis, cookies cleared once a session expires, and OAuth callbacks through the OAuth proxy checked like the direct ones
- **Dependencies**: `react` and `react-dom` 19.3.1, `prisma`, `@prisma/client` and `@prisma/adapter-pg` 7.10.1, `react-hook-form` 7.90, `zod` 4.6.7, `lucide-react` 1.60, `@hookform/resolvers` 5.9.2, `vitest` and `@vitest/coverage-v8` 5.0.5, `@axe-core/playwright` 4.14. The minimum versions in `package.json` move up with them, so a fresh install gets the fixed releases. Production dependencies audit at zero

### Fixed

- **No band around the page loader in dark mode.** On a large screen the strip behind the spinning logo came out a shade off the rest of the dimmed page; the loader now has a layer of its own

## [2.3.6] - 2026-10-17

⚡ **The proxy stops reading the session on every request.** It did so on public pages, link prefetches and crawler visits too, where nothing uses it, and on Vercel that was most of a small site's function time. Now it reads it only on sign-in, the dashboard, the admin and the billing routes. This is a PATCH: `git pull`, `npm install`. Nothing to migrate and nothing to configure.

### Added

- **Images and videos in the docs.** A Markdown image pointing into `public/media/` shows on GitHub and on the site alike, with the Markdown title as its caption; an `.mp4` gets player controls, and a `file.dark.webp` next to an image is used in dark mode. The rule is in `AGENTS.md`
- **The Quick start as a short looping clip**, in the README and in [Getting started](./docs/getting-started.md): clone, install and the first page of the app, recorded on a fresh clone
- **Running the kit on any Node.js host**, in [Deployment](./docs/deployment.md): build and start as the Next.js self-hosting guide describes, and the one thing that does not come along off Vercel, the cron that resets a public demo

### Changed

- **`src/proxy.ts` reads the session only on the routes in `AUTH_ROUTES`, `ADMIN_ROUTES` and `PROTECTED_ROUTES`.** The redirects are the same, and a new test fails if a public page reads it again. If you added a private area outside `/dashboard`, it still belongs in `PROTECTED_ROUTES`, as the comment in the file says
- **The menu button takes over below 1280 px**, so a tablet in landscape gets the menu instead of a row of links that ran into the edges. The menu stops at the bottom of the screen and scrolls, so a phone on its side reaches every item
- **The docs say what Vercel's free plan is for**: the Hobby plan is for non-commercial projects, so an app that takes payments needs Vercel Pro or another host. In the README and in Deployment
- **Dependencies**: `next` and `eslint-config-next` 16.4.0, the Radix packages to their current releases, `lucide-react` 1.59, `resend` 6.34.1, `@playwright/test` 1.64.1, `dotenv` 18.0.8, `@types/node` 26.6.5. Production dependencies audit at zero

### Fixed

- **Someone who unsubscribed through a Broadcast can sign up again.** The unsubscribe link in a Broadcast is Resend's: it marked the contact unsubscribed on Resend and left the database saying confirmed, so a new signup got nothing at all. The endpoint now asks Resend about an address it already has as confirmed, and sends a new confirmation when Resend has it unsubscribed; confirming brings the contact back on both sides. See [Newsletter & waitlist](./docs/newsletter.md)
- **Opening a guide from the docs index no longer shrinks the page.** From 1536 px up the public pages are 12% larger, and the guides were the only ones left out
- **Videos in `public/` load.** The proxy took `/file.mp4` and `/file.webm` for pages and answered 404

### Documentation

- **The API version of the Stripe webhook endpoint**: the endpoint has its own, chosen when you create it, and the events follow that one, not the version in `src/lib/stripe.ts`. Pick the same one, and update the endpoint whenever the kit changes `apiVersion`. In Deployment and Billing

### If you customised the proxy, the navbar or the newsletter

Expect conflicts in `src/proxy.ts`, `src/components/landing/navbar.tsx`, `nav-links.tsx`, `mobile-menu.tsx`, `src/lib/email.ts` and `src/app/api/newsletter/route.ts`: see [Upgrading](./docs/upgrading.md).

## [2.3.5] - 2026-10-10

📨 **Bring your own email provider.** Every email the kit sends now goes through one function, so moving from Resend to SMTP, Postmark or any other service means rewriting one file, and a new guide walks through two examples. Asked for in [#48](https://github.com/baonguyenyam/lessgap-sass-module/issues/48). This is a PATCH: `git pull`, `npm install`. Nothing to migrate and nothing to configure: Resend stays the default and works as before.

### Added

- **`sendEmail()` and `emailEnabled()` in `src/lib/email-transport.ts`.** Every email goes through the first, and every "is email set up?" asks the second instead of reading `RESEND_API_KEY` in nine places. [Email](./docs/email.md) shows Nodemailer over SMTP and Postmark, the three behaviours to keep when you swap, and a note on text messages
- **A one-line signup in the footer of every public page**, feeding the same double opt-in list as the pricing waitlist, with `footer` as its source in the admin export. It stays off until you set `WAITLIST_ENABLED="true"`, once your real privacy policy is live (the one that ships is a placeholder), and needs an email provider; `WAITLIST_ENABLED`, until now meaningful only on the kit's own site, is the gate for every form that collects addresses on its own. Disabled in demo mode. The line above the field is in `footer.signup`; to drop the form, delete its line in `footer.tsx`. See [Newsletter & waitlist](./docs/newsletter.md)
- **Every code block in the docs and the blog has a header**: the file name when the fence gives one, otherwise the language (Terminal, TypeScript, .env...), and the Copy button on the right

### Changed

- **One loading state for every page change in the dashboard and the admin**: the page dims as behind a dialog, with the logo turning in the middle, after 120 ms. Pages without a `loading.tsx` of their own no longer sit still while the next one loads, back and forward included
- **The account menu sits at the top of the sidebar**, under the logo, in the dashboard and the admin, and opens downwards. Its items are unchanged
- **The landing hero**: the headline is two lines of the same size, a little bolder than medium, the subtitle runs wider, and from 1280 px up the dashboard preview scales to the full content width. The preview follows the real sidebar, with the account menu under the logo, and its theme switch turns only the preview light or dark: a `.light` class now scopes the light theme inside a dark page, as `.dark` already did the other way round. A clone without a `hero.$product.trust` line shows nothing under the buttons
- **The top menu is as wide as the footer's content**, and from 1536 px up the public pages grow by 12% as a whole, so on a wide monitor the content no longer fills barely half the screen. The dashboard and the admin are not affected
- **Dependencies**: `react-hook-form` 7.89, `vitest` and `@vitest/coverage-v8` 5.0.3, `@shikijs/rehype` 4.5, `@types/node` 26.6, `dotenv` 18.0.5, `lucide-react` 1.50, `pg` 8.23.1

### Fixed

- **Buttons and other clickable controls show the pointer cursor again.** Tailwind 4 dropped the rule that gave it to them, so most of the app showed the arrow. One rule in `globals.css` puts it back for buttons, selects, checkboxes, radios, file inputs, `summary` and labels, never on a disabled control, and a `cursor-*` class still wins over it. The items of a `Select` use it too, like the dropdown menu's
- **A page change starts at the top again.** From a scrolled page, the logo or a menu link could land halfway down the next one, often on a section: the smooth scrolling in `globals.css` animated the jump, and since Next.js 16 the router turns it off during navigation only when `<html>` carries `data-scroll-behavior="smooth"`, which the root layout now sets. The section links keep scrolling smoothly

### Security

- **`sharp` and `source-map-js` move to their fixed versions** (two high advisories). `sprintf-js` has no fixed version: it reaches the kit only through `argparse` 1, which `js-yaml` 3 under `gray-matter` uses for its own command line and never while reading the docs. An override scoped to that chain moves it to `argparse` 2. Production dependencies audit at zero

### If you customised the layouts, the landing, the loading pages or the emails

Expect conflicts in `src/app/(dashboard)/layout.tsx`, `src/app/(admin)/layout.tsx`, the `loading.tsx` files, `src/lib/email.ts`, `src/components/blog/code-block.tsx`, `src/components/landing/hero.tsx`, `src/components/landing/footer.tsx` and `src/app/globals.css`: see [Upgrading](./docs/upgrading.md).

## [2.3.4] - 2026-10-03

🔐 **Security: update now if you use the magic link together with Google or GitHub sign-in.** Better Auth 1.7.7 fixes a critical vulnerability ([GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm)): the state of an OAuth sign-in was accepted as a magic link token, so anyone who knew a user's email could sign in as them without access to the mailbox. The kit is affected when `RESEND_API_KEY` is set and at least one social provider has credentials. This is a PATCH: `git pull`, `npm install`. Nothing to migrate.

### Security

- **Better Auth 1.7.7** and its Prisma adapter. Magic links sent before the update stop working: ask for a new one
- **Magic link tokens are stored hashed** (`storeToken: "hashed"` in `src/auth.ts`): a copy of the database no longer holds a working link
- **Next.js 16.3.8**: seven advisories, among them a server-side request forgery in image optimization and cache poisoning on self-hosted static pages

### Changed

- **Authentication and Billing say what the kit is built for**: one person running their product, and three ways to add teams if you need them
- **Dependencies**: `next-intl` 4.14.9, `resend` 6.32, `@stripe/stripe-js` 9.17. Production dependencies audit at zero
- **The `next dev` indicator sits bottom right**, out of the way of the account menu

### Fixed

- **Every heading in the guides has its own anchor.** Upgrading had "What to do" twice, so the second link in its outline led to the first section. A test now fails on two headings with the same anchor in any guide, in any language

## [2.3.3] - 2026-09-26

🚀 **A fresh clone now reaches the dashboard by following the guide.** The guides put your variables in `.env.local`, the Prisma commands read only `.env`, so `npx prisma migrate deploy` stopped at *"The datasource.url property is required in your Prisma config file"* on a first run. And before a database exists the landing page had no plans to show, and failed. This is a PATCH: `git pull`, `npm install`. Nothing to migrate and nothing to configure.

### Fixed

- **`npx prisma migrate deploy`, `npx prisma db seed` and `npx prisma studio` read `.env.local` first and `.env` after it**, the order Next.js already used, so the commands in the guide and `npm run dev` open the same database. A variable set in the shell still wins over both files, which is what the production migration in [Deployment](./docs/deployment.md) relies on
- **A seed that fails exits with an error.** It used to print the error and exit 0, and Prisma signed off with "The seed command has been executed"
- **Without a database, the landing and pricing pages show the steps left** instead of failing: the one you are on is marked, and the full guide is one link away. Development only, and only until the database is ready

### Changed

- **The Quick start in the README is the same first run as [Getting started](./docs/getting-started.md)**: prerequisites, clone and install, `npm run dev`, database, tables, sign in. The setup of each provider (Google, GitHub, Stripe, Resend) stays in [Configuration](./docs/configuration.md), which had it all along
- **One command to generate `AUTH_SECRET`**, the `node` one, which works in PowerShell too. The guide used `openssl`, which Windows does not ship
- **The guides create the database before asking for its connection string**, which is the order you do it in, and say that the seed writes six example plans, one of them inactive, not two
- **Dependencies**: `lucide-react` 1.48, `vitest` and `@vitest/coverage-v8` 5, `@types/node` 26, `dotenv` 18. The kit's own tests, build and audit run green on all of them

### If you keep two different databases in `.env` and `.env.local`

The Prisma commands used to act on the one in `.env` and now act on the one in `.env.local`, the same one the app opens. Everything else is unchanged: see [Upgrading](./docs/upgrading.md).

---

## [2.3.2] - 2026-09-21

📬 **An email that Resend refused left no trace, and the contact form said it had been sent.** The Resend SDK does not throw when it refuses a message: it returns the error, and its own logging is switched off in production. None of the kit's calls looked at it, so a deployment on an unverified sending domain lost every email from the first one, sign-in and password reset included, with nothing in the logs. This is a PATCH: `git pull`, `npm install`. Nothing to migrate and nothing to configure.

### Fixed

- **Every email the kit sends, and the two audience operations behind the newsletter, now go through one check** that reads what Resend returns. A refusal is logged as `[email] <kind> rejected by Resend`, with Resend's reason and status and never with the recipient's address, which is masked even when Resend's own message quotes it back
- **The contact form says when a message did not go**, with the address to write to instead. It used to answer "sent"
- **The password reset, magic link, change of email and newsletter signup answer exactly as before**, on purpose: they answer the same way whether or not an address is registered, and an error on failure would tell a caller who has an account. The refusal is in the logs instead
- **An unsubscribe that Resend refuses to pass on is logged with what to do.** The contact is still in the Resend audience, so a broadcast sent from there would reach someone who asked not to be written to
- **The emails sent from the Stripe webhook, and the welcome email, are awaited** instead of being left running after the response, which a serverless platform does not guarantee to finish. They cannot fail the webhook: a refusal is reported, not thrown
- [Configuration](./docs/configuration.md) says where to look when an email does not arrive, and the three usual reasons

### Changed

- The send functions in `src/lib/email.ts` return `true` or `false` instead of Resend's response. The kit never read that response; if your own code did, TypeScript points at the line

---

## [2.3.1] - 2026-09-20

🔧 **`npm run check:deploy` stopped with an error instead of an answer on a database that has not taken the 2.0 migration yet.** If you are still on 1.x, take this release before you migrate: the command now runs to the end on your database, and the numbers it prints at the end are the ones to write down before a migration that moves your passwords.

### Fixed

- **`npm run check:deploy` on a database from before 2.0.** The account table there is still the Auth.js one, with `provider` and `providerAccountId`, so the check for duplicate `(providerId, accountId)` pairs asked for a column that does not exist, and the run ended with `column "providerId" does not exist` and exit code 2, one line before the row counts. The command now reads the shape of the table first and names it: not created yet, the shape it had before 2.0, or current. It reaches the user, account and session counts in all three, and a column difference it has never seen no longer ends the run. On a current database the output is unchanged
- **Two documentation lines left over from before 2.0.** `AUTH_SECRET` was described as signing session JWTs, which it has not done since sessions became rows in the database, and both [Configuration](./docs/configuration.md) and [Getting started](./docs/getting-started.md) told you to generate it with `npx auth secret`, the CLI of the library the kit no longer depends on. The variable signs the session cookie and encrypts two-factor backup codes, so changing it signs everyone out and makes existing backup codes unreadable, and `openssl rand -base64 32` is the command shown now. `.env.example` also notes that `DIRECT_URL` is not read by the kit
- **Three environment variables shipped explained only in `.env.example`**, while the documentation index promises that every one of them is explained in [Configuration](./docs/configuration.md). `WAITLIST_ENABLED`, `NEXT_PUBLIC_DISABLE_ANALYTICS` and `NEXT_PUBLIC_LLMS_SUMMARY` are now in the guide, in both languages. The middle one is the one worth knowing: left empty, Vercel Analytics is mounted
- **[Deployment](./docs/deployment.md) says that the host does not identify the database.** On Neon one endpoint can serve several databases, so two connection strings can differ only in the name after the last `/` and reach entirely different data. Both `npm run check:deploy` and `prisma migrate deploy` print the database next to the host, and that is the line to read before you migrate anything
- The README said CI runs lint, tests and the build. It also runs `npm audit` as a gate, which is the step that stops a push when a runtime dependency has a high advisory

### Changed

- `resend` from 6.28.0 to 6.28.1

---

## [2.3.0] - 2026-09-19

💳 **Free trials, promotion codes, optional Stripe Tax and PDF invoices, and a command that tells you whether a database is ready for the code you are about to deploy.** This is a MINOR: `git pull`, `npm install`, `npm run check:deploy`, `npx prisma migrate deploy`. The migration adds two nullable columns, and the two new environment variables are optional and off by default.

**Run `npm run check:deploy` before you deploy, from now on.** Builds do not run migrations, so a deploy can put new code in front of a database that is still behind it, and nothing fails at that moment: public pages keep rendering, and the first sign-in or checkout that touches a missing column fails with a database error that does not say what happened. The command reads your database, names the migrations it is missing, and never writes anything. [Upgrading](./docs/upgrading.md) has the steps.

### Added

- **Free trials**, set per plan with `Plan.trialDays`, and offered **once per customer**: anyone who has had a subscription, a cancelled one included, checks out without a trial, which is what stops cancelling and resubscribing from restarting it. The card is collected up front, as Checkout does by default, so the first charge happens when the trial ends with no second step. The billing page shows the end date, and plan cards show a trial only to someone who would get it. The seeded Pro monthly plan has 14 days, to show the pattern
- **Promotion codes at checkout**, behind `STRIPE_ALLOW_PROMOTION_CODES="true"`. Off by default, because Checkout shows the code field whether or not any code exists. An active discount appears on the billing page with its amount, how long it lasts and the code that applied it, read from Stripe when the page loads
- **Stripe Tax at checkout**, behind `STRIPE_AUTOMATIC_TAX="true"`: automatic tax, a required billing address and tax ID collection. Stripe does not refuse a checkout when Stripe Tax is not active on the account: it creates the session and charges no tax. So at checkout the kit asks Stripe for the Tax settings and logs a warning naming what is missing until the setup is finished. It never blocks a payment
- **A link to the PDF** of every invoice, next to the hosted invoice page
- **`npm run check:deploy`**: connection, migrations missing or stuck half way, the account table of a database that came through 2.0.x, and row counts. It prints which database it is looking at before anything else, warns when the connection string is the pooled one, and exits 0 when ready, 1 with what to fix, 2 when it could not check. A `DATABASE_URL` set in the shell wins over the env files, so the same command checks production
- **[Deployment](./docs/deployment.md) shows how to point these at production**: the connection string goes on the same line as each command. Setting it once for a shell and then running three commands fails quietly when the shell no longer has it, because the fallback is your own env files and the migration reports success against your development database
- **`/api/health` reports whether the database has every migration the build ships**, as `schema: { aligned, pending }`: a boolean and a count, never the migration names, and `null` when the database cannot be asked. `npm run smoke` fails on a deployment whose database is behind

### Changed

- **Three light theme colours are darker**: the destructive red (`#ef4444` to `#c81e1e`), muted text (`#737373` to `#6b6b6b`) and the success badge text (green-600 to green-700). Each is the lightest value that clears WCAG AA on every surface it is drawn on, where the danger zone cards, error messages, the delete button, the getting-started checklist, the upsell card and the success badge were below 4.5:1. If you set your own `--destructive` or `--muted-foreground` in `src/app/globals.css`, check them on tinted surfaces as well as on white
- **The subscription confirmation email, when a subscription starts with a trial**, says the trial has started and when the first charge happens, instead of announcing an active subscription with an amount
- **`scripts/verify-auth-migration.mjs` is replaced by `npm run check:deploy`**, which runs the same two checks on the account table among the others
- **Stripe API version** moved from `2026-07-29.dahlia` to `2026-08-26.dahlia`, with `stripe` 22.6.2. Nothing in Stripe's changelog between the two is marked breaking. If you pinned the previous one deliberately, `src/lib/stripe.ts` is the line to change back
- `next` and `eslint-config-next` to 16.3.5, `react` and `react-dom` to 19.3.0, `better-auth` and `@better-auth/prisma-adapter` to 1.7.5 with no schema change. Upgrade the last two together: moved one at a time, npm can leave two copies of `@better-auth/core` in the tree while the build stays green, and `npm ls @better-auth/core` should print a single version
- The end-to-end config reads `.env.local` and `.env`, so the checkout test runs whenever a Stripe price is configured instead of skipping itself

### Fixed

- **The settings page no longer fails for anyone who signed in more than a day ago**, which is most people most of the time. The active sessions card listed devices through Better Auth's `listSessions`, and that endpoint requires a session created within `freshAge`, a day by default, refusing anything older with "Session is not fresh". The error took the whole page down, not just the card. Sessions have been rows in your own database since 2.0, so the list is read from them directly; ending a session is unchanged. **This affects 2.2.0 too**, where the card shipped: taking 2.3.0 fixes it
- **The accessibility audit judges the whole page.** axe decides colour contrast only inside the viewport and leaves the rest undecided, which the audit did not count, so anything below the first screen went unchecked. Each page is now measured at its full height, and sign-in is also audited with an error message on screen
- **Invoice amounts are shown in the invoice's own currency**, as the invoice total. They carried a dollar sign whatever the currency, and showed what had been paid so far, which on an open invoice read as zero
- **Subscription and invoice statuses show as labels** instead of Stripe's codes, on the billing page and on the dashboard home
- **`DIRECT_URL` is documented as what it is**: nothing reads it since Prisma 7 moved the connection to `prisma.config.ts`, and migrations run over whatever `DATABASE_URL` holds. [Deployment](./docs/deployment.md) shows how to point them at the direct connection

### Notes

- **A coupon that lasts a number of months counts from when it is applied**, a trial included: three months applied at the start of a 14-day trial cover about two and a half paid months
- **Stripe Tax is a paid Stripe feature**, charged per transaction on top of the usual fees, and it **calculates and collects while registering you nowhere.** It collects only where you have added a registration, and a price with no tax behaviour set is treated as tax exclusive. [Billing](./docs/billing.md) has the setup
- **Reminder emails before a trial ends are Stripe's**: turn them on in your Stripe Billing settings rather than in the kit
- **Two items announced for this release are not in it.** Plan changes with proration stay in the Stripe Customer Portal, which already prorates. Profile photo upload is not part of it either, so the kit still accepts no file from outside
- The source archive attached to the `v2.2.0` tag carries 16 September as the date of 2.2.0 in this file. The release date is 13 September: the file was corrected on `main` afterwards, and release tags are not moved

## [2.2.0] - 2026-09-13

🔐 **Two-factor authentication, active sessions, and an accessibility audit that runs with the tests.** This is a MINOR: `git pull`, `npm install`, `npx prisma migrate deploy`. The migration is additive, and there is no new required environment variable.

**Two behaviour changes to know about**, because they affect accounts that turn 2FA on. Better Auth asks for the second factor on email sign-in and nowhere else, so the kit closes the two paths that went around it. Accounts with 2FA **no longer receive a magic link**, since it opens a session directly; the response stays identical to the normal one, so the form cannot be used to ask whether an address has an account. And **automatic account linking is refused** for them, because otherwise whoever controlled a Google account with the same address could sign in with no password and no code. Connecting a provider yourself from Settings still works, since that request carries your session. Both are decisions rather than defaults, and [Upgrading](./docs/upgrading.md) says where to change them.

### Added

- **Two-factor authentication (TOTP, RFC 6238)**, self-hosted, from Dashboard → Settings. No vendor and no SMS bill. The QR code is rendered server side as SVG, so no QR library reaches your users' browsers, and the manual key is there for anyone who cannot scan. The name shown inside the authenticator app comes from your `siteConfig.name`
- **Enabling it takes two steps**: the first shows the QR code, the key and the backup codes, and only a correct code from the app switches it on. A setup abandoned halfway leaves the account exactly as it was
- **Ten backup codes**, each good for one sign-in and spent when used. Generated upper case and without `0`, `O`, `1` or `I`, because they get typed back in from paper, and stored encrypted with `AUTH_SECRET`
- **Active sessions in Settings**: every session with its device, browser and IP address, the current one marked, and a button to end any of the others. Sessions have been database rows since 2.0, so this is a view of what was already there
- **Change your email address**, in two confirmations: one to the new address to prove you hold it, one to the old address so a stolen session cannot move an account away quietly
- **Rate limiting on a shared store.** Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and the counters move to Upstash Redis, shared by every instance and region. Both optional by design: a required variable would have made this release a major one. No client library is installed, and an unreachable store falls back to the in-memory counter
- **Syntax highlighting and a copy button** on every code block in the docs and the blog. It runs at build time and ships no JavaScript: both themes are written into the markup as CSS variables, so dark mode switches with no second render and no flash
- **A header naming the file a snippet comes from**, with an icon for the file type. Write `title="src/lib/auth.ts"` on the fence, or `filename=`
- **An accessibility audit that runs with the tests**: axe-core against WCAG 2.1 AA on eight pages, the signed-in ones included, failing the build on serious and critical findings

### Changed

- **A more distinctive brand mark by default**: an allen key head in place of the plain hexagon. It only shows if you ship without rebranding
- **Modal overlays blur what is behind them** (dialog, alert dialog and sheet), so the page underneath stops competing with the modal. More visible on the light theme than on the dark one
- `checkRateLimit` is now async and its callers await it. Internal: the surface the kit promises you does not move
- The active navigation item carries `aria-current`, so what was visible is now also announced

### Fixed

- **An OAuth failure no longer leaves your site.** `onAPIError.errorURL` was never configured, so every OAuth error landed on Better Auth's own error page. They now arrive at `/login` as a code in the query string, which that page already displays
- **The hero mockup is no longer read out as content.** It is a picture of the product drawn in markup, and a screen reader announced its contents in the middle of the home page. It is `aria-hidden`
- **The monthly/yearly toggle on pricing** pointed with `aria-controls` at elements that did not exist. It is two buttons in a group with `aria-pressed` now. Same classes, nothing moves
- **The cover image on a blog card** was a second link to the same article with no accessible name. It is out of the tab order, and the mouse behaves identically
- Contrast raised on two pieces of text that were below the ratio

### Security

- **sharp to 0.35.4** ([GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), high), which carries two fixes from the upstream libheif dependency. It reaches the tree as an optional dependency of Next.js rather than as one of ours, so no `overrides` entry is involved
- **js-yaml in both places it appears** ([GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh), high): 3.15.2 under `gray-matter`, which is the copy in the production tree, and 4.3.2 under ESLint, which is development only
- **Neither is reachable from outside in the kit as it ships**, and the reason differs for each. `next.config` declares no `images` configuration and no route accepts an upload, so the optimiser only ever handles assets you shipped yourself and sharp is never handed a file chosen by a visitor. `gray-matter` parses the frontmatter of the Markdown in your own repository, at build time, so the YAML it reads is yours. They are updated to keep the tree clean. After pulling, `npm audit` reports zero

### Notes

- **Rotating `AUTH_SECRET` makes every stored TOTP secret and backup code unreadable**, so users with 2FA on would have to set up their authenticator again. Worth knowing before you rotate it
- **If both the phone and the backup codes are gone there is no self-service way back in**, by design. An administrator clears the second factor with two SQL statements, in [Authentication](./docs/authentication.md)
- **OAuth sign-ins are not asked for a code on top**, because a second factor on the provider's side is the provider's job. [Authentication](./docs/authentication.md) has the table of which way in asks for what
- **Profile photo uploads move to 2.3.** They would be the first endpoint in this kit that accepts bytes from outside, which means file type validation, a size ceiling, a filename the user does not choose and storage behind an optional variable. That is a release of its own
- **What the accessibility suite does not cover** is stated in the test file: axe finds the mechanical third of WCAG. Keyboard completion, focus order and whether a label says something useful stay manual. Minor and moderate findings are printed but do not fail the build

## [2.1.0] - 2026-09-06

🔄 **Better Auth removed the `issuer` column that 2.0 was built on, and this release follows them back.** If you are on 2.0.0 through 2.0.3, take it and run the migration. If you are installing the kit for the first time there is nothing to do: your database is built from the current schema.

Better Auth 1.7.0 added a required `issuer` column to the account table and found accounts by `(issuer, accountId)`. On 5 September they reverted it, and 1.7.3 shipped the next morning. Their reasoning, and it is a fair one: a required column that a populated 1.6 database cannot take without a backfill is too risky to ask of a production service, so restoring the previous schema is the less disruptive path. They have committed to leaving the core schema alone for the rest of v1.

The consequence for anyone on 2.0.x is not cosmetic. Better Auth 1.7.3 never writes `issuer`, and a `NOT NULL` column with no default that nobody writes rejects every insert, so every sign-up and every account link fails. The library now checks the schema when it starts, including in production, and refuses authentication rather than failing one insert at a time. Your lock file pins 1.7.2, so nothing breaks until a dependency update moves you, which is the actual risk: the change arrives wearing a patch number.

`docs/upgrading.md` has the steps, including what to do when two accounts share a `(providerId, accountId)` pair.

### Changed

- **`Account.issuer` is gone, and `@@unique([providerId, accountId])` is back**, which is the identity this kit used before 2.0 and the one Better Auth used in 1.6. The migration drops the unique index before the column, which is the order Better Auth's guide insists on: MySQL rebuilds an index whose column disappears and turns a compound unique index into a constraint on `accountId` alone, which rejects a user holding the same account id at two providers. This kit is Postgres, where that does not happen, but the order is free and SQL gets copied
- **The migration refuses to run on duplicate account keys** rather than letting Postgres report a constraint violation at the end. On 1.7.0 through 1.7.2 two provider configurations could share one issuer and collapse into a single row; from 1.7.3 each provider keeps its own row again, so a duplicate pair has to be resolved first. It names the pairs
- **`scripts/verify-auth-migration.mjs` checks something different now.** It used to ask the library what issuer each provider declares and compare that with your data. Both helpers it relied on were removed in 1.7.3, so it would not even import. It now reports whether the `issuer` column is still required and whether any two accounts share a `(providerId, accountId)` pair, and it is useful both before and after the migration
- `better-auth` and `@better-auth/prisma-adapter` to 1.7.3, and `zod` to `^4.5.4`, which 1.7.3 requires

### Fixed

- **Every page has an Open Graph image again.** The home page, pricing, docs, blog and the legal pages declared `twitter:card: summary_large_image` and no image at all, which asks a platform for the large card and hands it nothing. The generated image at `/opengraph-image` was working the whole time and simply never referenced: Next merges `openGraph` shallowly, so a page that declares the object replaces the parent's and loses the image the file convention put there. A colocated image survives, which is why blog posts were unaffected and nothing looked wrong from inside the site

### Notes

- **This is not the v2.1 the roadmap described.** Two-factor authentication, rate limiting on a shared store, the accessibility audit and profile photos move to v2.2, and `Billing depth` becomes v2.3. A schema that disagrees with the library underneath it comes before new features, and 2FA in particular touches the sign-in flow, which is where 2.0.2 went wrong. It gets a release of its own rather than a corner of this one
- We had opened a documentation pull request upstream about the issuer, because the Auth.js migration guide was the one guide of theirs that never mentioned it. It was [closed](https://github.com/better-auth/better-auth/pull/11079), absorbed into the larger revert rather than turned down. The guide no longer needs that paragraph, because the column no longer exists

## [2.0.3] - 2026-09-02

🔒 **Three high severity advisories reached the dependency tree in two days, and none of them is reachable from this kit.** They are fixed here anyway, because a lock file carrying open advisories is something every clone inherits, and because `npm audit` is a step in this project's CI. Nothing in this release changes how the kit behaves. After pulling, `npm audit` reports zero.

Where they come from is worth knowing, because it explains why one of them needed more than an update. `mysql2` arrives through the Prisma CLI, which pins it to an exact version, so no Prisma release in the 7 line moves it: it takes an `overrides` entry, and that entry can be deleted once Prisma 8 ships without it. The kit runs on PostgreSQL and rejects a `mysql://` connection string at startup, so the code path the advisory describes is never entered. `fast-uri` arrives through `ajv` under `@hookform/resolvers`, and the kit imports only the Zod resolver, so `ajv` never loads. `browserslist` sits in the ESLint chain and never reaches a running application.

### Security

- **`mysql2` pinned to `^3.24.3` through `overrides`**, closing [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), an auth plugin downgrade to `mysql_clear_password` that leaks credentials, and [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), an unbounded zlib inflate in the compressed protocol. The first is fixed in 3.22.0 and the second in 3.23.1, so stopping at the version the first advisory names would have left the second one in place
- **`browserslist` to 4.28.8 and `fast-uri` to 3.1.7.** Both were already inside the ranges the kit declares, so these are a lock refresh and need no override

### Added

- **An `updated` date for posts.** Optional frontmatter that sets `dateModified` in the article schema, `modifiedTime` in Open Graph and `lastModified` in the sitemap, and prints an `Updated:` line beside the publication date. Without it, editing a published post stays invisible to a crawler until its next natural visit, and invisible to a reader deciding whether a two month old guide still applies. It holds one date, the most recent one: edit a post three times and you overwrite it three times
- **It deliberately does not change ordering.** The index stays sorted by `date`. Moving `date` forward is the shortcut it exists to replace, because that announces freshness by lying about publication and pushes an old post back to the top
- **The build refuses an `updated` earlier than `date`.** That pair ships a `dateModified` before `datePublished`, which is invalid structured data, together with a sitemap `lastmod` that moves backwards, and neither of those complains on its own
- **`docs/blog.md` says when to set it**, which matters more than the field: only when the substance changed, never for a typo or a fixed link. A modification date is a claim, and raising it on every small edit teaches search engines to stop trusting the dates on your site, sitemap `lastmod` included. The cost of overusing it is not a penalty, it is losing the signal

### Changed

- **The two dates on a post are now labelled** `Published:` and `Updated:`. Side by side and unlabelled they read as a date range. The cards on the index carry a single date and stay as they were, and the date format is unchanged everywhere
- `next-intl` to 4.14.2, `lucide-react` to 1.39.0, and `prisma`, `@prisma/client` and `@prisma/adapter-pg` to 7.10.0

## [2.0.2] - 2026-08-31

🔴 **The 2.0 migration wrote the wrong issuer for Google accounts, and it can lock those users out.** If you migrated to 2.0 and your users sign in with Google, Apple, Facebook or LINE, take this release. If you only use GitHub, a password or a magic link, nothing here affects you and the migration finds nothing to do.

The 2.0 migration gave every OAuth account an issuer of `local:oauth:<provider>`. That is what Better Auth builds for a provider that declares no issuer of its own, which is true of GitHub and not of Google, whose issuer is `https://accounts.google.com`. Account lookup at sign in is by `(issuer, accountId)` with no fallback on `providerId`, so those rows are never found.

The failure is worse than a duplicate account. Better Auth would link the unrecognised sign in to the existing user by email, but that path is refused when the local user's `emailVerified` is false, which is the default. The 2.0 migration derives `emailVerified` from whether the Auth.js timestamp was set, and Auth.js leaves it null for most accounts created through OAuth, so those users get `account not linked` and cannot sign in at all.

We found it while checking whether the issuer format was worth reporting upstream. It was not: the value is documented in Better Auth's own 1.7 upgrade guide, and in the Clerk, Auth0 and Supabase migration guides. The guide we read, the one for migrating from Auth.js, is the only one that omits it.

### Fixed

- **A new migration repairs the issuer** of Google, Apple, Facebook and LINE accounts. It is a new file rather than an edit of the 2.0 one, because an applied migration is never run again: editing the 2.0 file would repair nobody who had already migrated, which is everybody this affects. It converges from both directions: run it after 2.0, or straight after a fresh 2.0, and the result is the same
- A user who already signed in after 2.0 has two rows, the migrated one and the one Better Auth created. The migration removes the stale one rather than updating it, which would collide with the unique index on `(issuer, accountId)`
- **The migration stops instead of guessing** for Cognito, Microsoft Entra ID and Paybin, whose issuer is built from your own configuration or from the token. `docs/upgrading.md` has the queries to repair those by hand
- `docs/upgrading.md` said the issuer was `local:oauth:<provider>` for every social account. It now says what the value depends on
- **Nothing else needs repairing by hand.** `emailVerified` stays as it is: with the issuer corrected, the pair `(issuer, accountId)` finds the account directly and the email linking path is never reached. The first successful sign in sets `emailVerified` back to true on its own

### Added

- **`scripts/verify-auth-migration.mjs`**, read only. It asks the library what the issuer of each configured provider should be and compares that with what is stored, rather than comparing your database against a value written into the script. That distinction is not academic: our own release check for 2.0 confirmed the issuer matched the string we had typed, so it was green while the value was wrong. Run it after upgrading:

  ```bash
  node --env-file=.env scripts/verify-auth-migration.mjs
  ```

- The Better Auth badge in the README has its logo back

## [2.0.1] - 2026-08-28

📝 **The kit said Auth.js in the places people read first.** 2.0 changed the library and left its name behind on the README badge, the feature table, the landing page copy and the site description, so the shop window advertised the library the release had just removed. No code behaviour changes.

### Fixed
- **README, landing page and site description now say Better Auth**, including the badge, which also carried an Auth0 logo that was never right
- **`docs/authentication.md`**: the magic link is a plugin with `sendMagicLink`, not a Resend provider; adding a social provider goes under `socialProviders`; and linking an account that already has the same verified email is the default now, so the flag that used to be needed is gone
- **`docs/deployment.md`**: `AUTH_TRUST_HOST` no longer exists. Deploying outside Vercel needs no extra variable, because `NEXT_PUBLIC_APP_URL` is passed to Better Auth as the base URL and the origin is never guessed from a `Host` header. Extra origins go in `trustedOrigins`
- **`.env.example`**: the commented `AUTH_TRUST_HOST` block removed, so nobody copies a variable nothing reads
- Code comments that still described the old library
- **The outline on posts and docs pages scrolled badly when it was long.** Its scrollbar sat against the text with nothing between them, and the list never moved: reading to the bottom of a long article highlighted an entry that had scrolled out of sight. The list now scrolls on its own with the heading kept in place above it, the bar has room of its own reserved whether it is needed or not, and the highlighted entry is kept in view as you read. The scrolling is done by hand rather than with `scrollIntoView`, which cannot be told to leave the page alone and would move the article under the reader

## [2.0.0] - 2026-08-28

🔐 **Authentication moves from Auth.js to Better Auth.** That is the whole release: no new features, nothing else to review, so the upgrade is as easy to adopt as a library change can be. Auth.js is now part of Better Auth and its own README points new projects at it, and a app is a new project every time someone clones it. Version 1.7 built the boundary that makes this cheap, and it held: changing library touched seven files, and they are exactly the seven that 1.7 named in advance.

### Breaking

- **Everyone is signed out when you deploy.** Session tokens belong to the library that issued them. Your users are not locked out, they are logged out
- **There is a database migration, and it moves data.** Password hashes leave `User.passwordHash` for a row in `Account`. If that move does not happen the database stays valid, nothing errors, and every user with a password silently cannot sign in. Count before and after, and stop if the numbers disagree: `docs/upgrading.md` has the two queries
- **`emailVerified` becomes a boolean** and `name` becomes required. Users without a name get the local part of their email, empty strings included, because an empty string satisfies the constraint while still showing a blank name
- **`PasswordResetToken`, `User.sessionVersion` and `src/lib/session.ts` are gone.** Reset tokens live in `Verification`, and sessions are rows that can be deleted, which is what `sessionVersion` was imitating
- **`SessionProvider` is gone from the root layout.** The client reads the session without one
- **`next-auth` and `@auth/prisma-adapter` are uninstalled.** Code written against the boundary needs no changes. Code that imported `auth()` from `@/auth` directly is what you have to rewrite

### Added

- **Sessions live in the database.** Revoking one is deleting a row, immediately and everywhere, instead of waiting out a token that cannot be recalled. `session.cookieCache` keeps the cost to one signed cookie read for most requests
- **Rate limiting out of the box**: three attempts every ten seconds on password sign-in, stricter than the hand rolled check it replaces
- **An end to end test for signing in.** The suite tested signing up, which issues its own session, so the credentials path was never actually walked. It is now, against a migrated database

### Changed

- **bcrypt hashes keep working.** Better Auth hashes with scrypt by default; the kit passes its own hash and verify functions, so existing passwords still verify and **nobody has to reset anything**
- **No environment variable is renamed.** `AUTH_SECRET` keeps its name and `NEXT_PUBLIC_APP_URL` is reused as the base URL, because the upgrade already signs everyone out and a rename on top of that buys nothing
- **Signing up sends a verification email** instead of a magic link that doubled as one. Same destination, one fewer trick in the middle
- **The route handler moved** from `src/app/api/auth/[...nextauth]` to `src/app/api/auth/[...all]`. If the build then fails on a module you deleted, remove `.next`: it is the old route name cached

### Fixed

- **`npx prisma db seed` did nothing.** Prisma 7 stopped reading the `prisma` key in `package.json` and wants `migrations.seed` in `prisma.config.ts`. It printed instructions and exited, so a fresh clone ended up with no plans, which means no pricing page and no checkout, with nothing that looked like an error
- **`npm run db:seed` and `db:seed:demo` failed to compile** under TypeScript 6, which reports the `moduleResolution` value the ts-node block was using as deprecated

## [1.7.0] - 2026-08-27

🎨 **UI kit expansion.** The form and overlay primitives the kit had left to plain HTML, and the features that put them to work instead of a gallery page nobody opens: the blog splits into real paginated routes, the admin panel gets a revenue chart, settings opens as a modal whose URL is still a page, and an account can finally be deleted. Plus a pass over every page on a phone, per-page social previews, and the boundary that makes the next major a one file change.

### Added
- **The form primitives the kit was missing**: select, checkbox, radio group and textarea, with [react-hook-form](https://react-hook-form.com) as the form layer. A form validates against the same Zod schema the server action already checks, so the rules exist once instead of as a browser copy that drifts out of step
- **Overlays and navigation**: popover, sheet, alert, alert dialog, breadcrumb, pagination and skeleton, each documenting when *not* to use it. A popover does not trap focus, so it is right for something optional beside its control and wrong for a decision that blocks; an alert is a message that stays, while what follows a click is a toast; a skeleton has to carry the shape of what it replaces, or the page jumps when the data lands and it is worse than the spinner it improved on
- **Blog pagination as real routes.** `/blog` and each category page split every twelve posts into prerendered routes rather than a query string, so every page has an address of its own that can be linked and returned in a result. Page one keeps the bare address, a number past the end is a 404 rather than an empty page that still looks valid to a crawler, and the RSS feed ignores paging and stays whole. `POSTS_PER_PAGE` lives in `src/lib/blog.ts`, and leaving it at zero lists every post on one page, the way the kit already treats a value you leave out
- **A recurring revenue chart on the admin panel**, drawn from the subscriptions already in your database
- **Deleting an account**, which the kit had never actually implemented: the only delete it shipped unlinked an OAuth provider. One `delete` carries away sessions, linked accounts, projects, tokens and the subscription row, because every relation to `User` already cascaded. The work is in the four refusals: demo mode, a confirmation that does not match (checked on the server too, because the browser is not to be trusted), the last remaining admin, and an active subscription, which is now cancelled on Stripe first rather than sending the user off to do it. If Stripe refuses, nothing is deleted: the unforgivable failure is the account disappearing here while the card keeps being charged
- **Settings opens as a modal, and its URL is still a page.** An intercepting route, because the account actions redirect back to `/dashboard/settings` and linking a provider leaves the application for the OAuth round trip: a client only modal no longer exists by the time the user comes back. One component renders both forms, so they cannot diverge
- **Projects**: a card grid, creation in a modal, and search
- **Breadcrumbs**, emitted on posts as `BreadcrumbList` structured data built from the same array the visible row renders, and in the dashboard without it, where there is nothing for a search engine to read
- **An outline and heading anchors on posts**, reusing the one the documentation already had
- **Per-page Open Graph**, so a link to your pricing page stops previewing like your home page
- **Your prices as structured data**, `SoftwareApplication` offers built from the same rows the pricing table renders, so an answer engine can state the figure instead of pointing at a page somebody has to open
- **An optional line in `/llms.txt`** for the sentence you want repeated about you. Shipped unset on purpose: a positioning line is the one piece of copy that cannot have a sensible default
- **`AGENTS.md`**, this project's rules for coding agents, nine of them and each with the reason it exists
- **[docs/upgrading.md](./docs/upgrading.md)**, written before it is needed rather than after: what a version number means here, and what a major asks of a clone
- **`@/lib/auth`, the boundary between this kit and whichever library handles authentication.** Everything outside the sign in flow reads the session through it, and it returns five fields and nothing a specific library adds on top. It is here now, working on the current library, so that v2.0 edits one file instead of twenty pages
- **The modules this release adds are covered before their figures are published**: the auth boundary, the builders behind structured data and page metadata, the project schema and the guards around usage reporting. The suite goes from 160 tests to 202, and all four coverage figures in the README move up rather than down

### Changed
- **Vercel Analytics can be declined**, with `NEXT_PUBLIC_DISABLE_ANALYTICS`. It shipped mounted unconditionally, which meant every deployment of the kit sent data from somebody else's product without its author being asked. Left unset it stays on, which is the useful default on Vercel
- **More room across the dashboard**: side margins doubled from `lg` up on every container, and the admin table takes back the width it was giving away
- **The roadmap is renumbered.** v2.0 is the authentication migration and nothing else, because a major that also adds things is a major people postpone. What was 1.9 becomes 2.1, what was 1.8 becomes 2.2, and Pro loses its version number, since it is not a release of the free kit
- **ESLint majors leave Dependabot**, alongside `next`, `react` and `react-dom` and for the same reason: `eslint.config.mjs` holds no rule of ours, so the ESLint version is governed by `eslint-config-next` rather than by us. Their peer range is a permission, not a statement that they tested the next major. The decision reopens on its own, the day a peer conflict shows up at install

### Fixed
- **Inline code wraps everywhere, from a single rule.** A forty character path with nowhere to break was running off the side of a phone, on the about page, the sign up and password recovery pages, and the empty state of the blog. `:not(pre) > code` in `globals.css` covers all of them instead of five patches. Fenced blocks stay excluded on purpose: those keep their lines whole and scroll in their own box, which is what you want when the line is a command to copy
- **Tables scroll in a box of their own**, in the documentation and in posts, rather than widening the page around them
- **Search and its button stack on a phone** instead of being squeezed side by side
- **Settings told a user who never used OAuth that their avatar came from their provider**, which was simply untrue. It also showed their email address twice on the same page, and selected their name when the modal opened. The email is now a read only field that says why it cannot be changed there

### Security
- **JSON-LD no longer closes the script element.** `JSON.stringify` does not escape `<`, so a string reaching the graph that contains `</script>` ends the element early and everything after it is parsed as markup. CodeQL reported it as stored XSS on the post page, but the sink was in four places, not one: posts, the break-even calculator, the home page and the FAQ block. A single `jsonLdScript()` in `src/lib/json-ld.ts` replaces `<` with `\u003c`, which also neutralises `<!--`, and the output stays valid JSON. Here the graph comes from post frontmatter and `siteConfig`, both written by whoever develops the site, but a blog fed by a contributor, a CMS or a generator is the normal case downstream, and that is where this bites
- **The CI workflow declares `contents: read`.** It declared no permissions at all, so `GITHUB_TOKEN` inherited the repository default. Nothing in it writes: it installs, lints, tests, builds and audits. A step added later now has to ask for more on purpose rather than finding it already in hand. It matters most on a public repository, where pull requests arrive from forks
- **`next` and `eslint-config-next` moved to 16.3.3**, a patch branch carrying backported fixes only, among them a catch-all route being served for every other slug

---

## [1.6.4] - 2026-08-21

🔐 **Role changes reach sessions that already exist.** Changing someone's role did nothing until they signed out, which by default is 30 days away. That included the documented way to create the first admin of a deployment, so the step in the deployment guide looked like it did nothing at all.

### Fixed
- **A role change now reaches a live session**, within about a minute. The role was stamped into the token at sign-in and never read again: the check that runs every minute selected `sessionVersion` alone. Promoting someone therefore had no visible effect until they signed out, and demoting someone left their privileges working for as long as the token lived. Both directions are covered now. **Present since v1.0.0**, so this is not a regression from the security patch in 1.6.3: if you followed *"Make yourself admin"* in the deployment guide and nothing happened, this is why. It is a re-read on a throttle, not instant revocation, and the doc says so
- **The admin panel promotes instead of toggling.** The action behind "Make Admin" read the current role and flipped it, so a page loaded before someone else promoted the same user would **demote** them on click, announcing *"User promoted to USER"* while doing it. The role to set now travels with the request, and the write is refused when the row no longer holds the role the admin was looking at
- **Canonical URLs on `/changelog`, `/privacy` and the blog category pages.** Each of those also exists under a locale prefix serving the same English text, which without a canonical is a duplicate with no declared original
- **Two internal links pointed at `/blog/`**, which answers 308 to `/blog`, so every post and every category page linked internally through a redirect
- The release links at the bottom of this file stopped at 1.6.2

### Added
- **A test that fails when the declared version disagrees with itself.** `package.json`, the app config and `package-lock.json` each carry the version, and npm does not update the lockfile copy when you edit `package.json`: it said 1.6.0 at the 1.6.2 release and 1.6.2 at the 1.6.3 one, in a file anyone who opens the repository can read
- The session rules moved into `src/lib/session.ts` with tests of their own, instead of sitting inline in the Auth.js callback

### Changed
- **`toggleUserRole` is now `setUserRole(userId, nextRole, seenRole)`.** If you called it from your own code, it takes the role to set and the role you last saw, and it no longer inverts whatever it finds
- **The tech stack section of the README is a list rather than a table**, where every service links to its own site and carries a line on why it is there instead of a vendor tagline. It also names two things the kit uses and never mentioned: **Radix UI** under the design system, and **Vercel Analytics**, which is mounted in the root layout and active on Vercel deployments, with a note on how to remove it
- **The documentation says what the rate limiter actually protects.** The limits on magic link, signup and reset guard **outbound email** rather than password attempts, where the argument about bcrypt does not apply. And the per-IP limit on public forms behaves differently away from Vercel: with no `x-forwarded-for` header everyone shares a single bucket
- **Dependencies**: next-intl 4.13.7, `@stripe/stripe-js` 9.14.0, Resend 6.21.0, Lucide 1.33.0, Vitest 4.1.11, `@types/pg` 8.23.1

---

## [1.6.3] - 2026-08-20

🛡️ **Security patch.** A high severity advisory landed in the dependency tree through Prisma, and no stable Prisma release closes it yet. This release pins the fixed version directly, so a fresh clone is clean.

### Security
- **`deepmerge-ts` forced to 8.0.1 with an npm override.** [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) is rated high and affects every version below 8.0.0. You do not depend on it directly: it arrives through `@prisma/config`, which both `prisma` and `@prisma/client` pull in, so moving packages between dependencies and devDependencies does not help. Note that `npm audit fix --force` "resolves" it by installing `prisma@6.12.0`, a major version backwards. The override is temporary and goes away when a stable Prisma release depends on version 8 on its own.

### Changed
- **Dependencies**: Next.js 16.3.1, Stripe 22.5.0, `@stripe/stripe-js` 9.13.0, Resend 6.20.0, Sonner 2.0.8.
- **README**: the "Why OpenStarterKit" section now leads with what the kit is, plain Next.js with no compiler, no config DSL and no proprietary CLI, instead of what it avoids. Same promise about owning your data, stated in a way you can verify by opening the repository.

---

## [1.6.2] - 2026-08-14

🔤 **Copy fixes.** Two FAQ answers were printing a template literal instead of the product name, and the test suite reported its failures in Italian.

### Fixed
- **Two FAQ answers rendered `${siteConfig.name}` literally**, one on the landing page and one in a clone, and both inside the home page `FAQPage` JSON-LD, so search engines were served the source code as well. The i18n work moved those strings from a component into a message file, where a template literal is text and nothing interpolates it. They now use the `{site}` placeholder, and the FAQ component substitutes it the way the transactional emails already did, because `t.raw` returns a message untouched: with `raw`, even the correct placeholder would have printed literally
- **Test failure messages were written in Italian**, nine of them across four files, along with two source comments. They ship with the kit, so the first time one of your keys goes missing you would have read the reason in a language you may not speak

### Added
- **A test that fails when a message file contains template literal syntax.** That syntax is never valid there, and no existing check could see it: the key exists, the type is right, the value is a valid string and the build stays green

---

## [1.6.1] - 2026-08-14

🔧 **The staleness check now works in your repository, not only in ours.** Same day as 1.6.0, because a check that passes only where it was written is worse than no check at all: it reports success to the one person who does not need it.

### Fixed
- **`npm run check:translations` failed on every clone of the kit**, all eleven files at once, with `"source_commit: 7fd7e49" is not a commit in this repository`. A git revision only resolves inside the history it was created in, and cloning starts a fresh one. The marker is now `source_checksum`, a short hash of the source file itself: it stays valid in any repository, needs no git, and works on a source archive downloaded from a release. Line endings are normalised before hashing, so one file gives one value on Windows and on Linux. **If you translated a doc under 1.6.0**, the check names the old field and prints the value that replaces it
- Two documentation paths still pointed at `src/app/(public)/blog/`, which 1.6.0 moved under `[locale]`
- The coverage figures in the README were measured two releases ago
- The release links at the bottom of this file stopped at 1.4.1

### Added
- **`AUTH_TRUST_HOST` in `.env.example`, and a deployment section for hosts other than Vercel.** Auth.js trusts the host it is served from when it detects Vercel and refuses it everywhere else, so a Docker or VPS deployment builds, starts, and then fails sign-in with *"There was a problem with the server configuration"* and nothing on the page to explain it. The kit says it runs anywhere Next.js runs, and did not say this

### Changed
- `lucide-react` 1.31.0 and `pg` 8.23.0

---

## [1.6.0] - 2026-08-14

🌍 **i18n & docs.** Every string a user can read now lives in a message file instead of inside a component. Shipping your product in a language that is not English becomes one JSON file to fill rather than a hundred components to hunt through, and the routing, the fallback and the language switch are already there rather than a refactor you pay for later. The documentation is bilingual, and the plumbing that makes it bilingual is yours.

### Added
- **i18n across the whole kit, built on [next-intl](https://next-intl.dev)**, with no translation service and no account required: plain JSON in the standard layout, so running it through Crowdin or anything else is your call and costs nothing today
- **A second locale that actually runs.** Italian ships alongside English because a scaffold that has never been executed with a second language is untested code, and the first person to add one would find the bugs. Removing it is three deletions, written down in `docs/i18n.md`
- **Routing with a prefix only for non-default languages**, so your English URLs stay exactly where they are. No automatic redirect from `Accept-Language`: a shared link resolves the same way for everyone
- **Fallback per key and per file.** A missing key renders the English text rather than a gap, and a documentation page with no translation is served in English with a note saying so, rather than a 404
- **A language switch in the documentation**, and Markdown docs that translate one file at a time: `getting-started.md` is translated by `getting-started.it.md`, with no index to update
- **`npm run check:translations`**: every translated doc records the revision of the English file it came from, and this fails when that file has moved on. A stale translation never breaks, it quietly becomes instructions for an older version of your product
- **`hreflang` and `x-default`, emitted only where a translation exists.** Declaring them on a page that falls back would tell a search engine that two URLs hold the same page in two languages when they hold it in one
- **A figure component for diagrams**: an image linked to itself opens in an overlay instead of a new tab, and your posts get it without changing a line of Markdown. The portable form still renders on GitHub and in a feed reader
- **A newsletter signup block usable inside a post**, so a reader who is already convinced does not have to navigate to a different page to act
- **`FAQPage` structured data from post frontmatter**: a post declares `faq: [{q,a}]` and the page emits it alongside `Article`. On `main` since 3 August and never part of a tagged release
- **`docs/i18n.md`**, a guide for the whole of the above: adding a language, translating the docs, and the checks that catch a stale one

### Changed
- **The documentation section keeps the site header** like every other page, the two side columns stay put while only the article scrolls, and on a phone the content comes before its navigation rather than after nine links
- The docs pages end with the site footer, which until now only the documentation index had
- Plan and marketing copy that differs between a showcase deployment and the product it ships as is now resolved at build time, so a clone no longer carries wording it can never render inside its own HTML. `docs/configuration.md` explains how to point the same mechanism at a marketing site and an app of your own, on two domains from one repo

### Fixed
*These were all in `v1.5.0`, so a clone from that tag has them.*
- **Dates and currency were formatted with `en-US` written by hand** in five and two places. A date is interface: a language that writes the day first was showing the wrong one
- **Two plurals were English ternaries**, which hold only for languages with two forms. Both are ICU messages now, and one of them had its zero case as a separate `if` that is part of the message
- **The documentation index in `docs/README.md` was two guides behind the folder**, and nothing said so. A test now fails when it drifts again

### Security
- **`next` and `eslint-config-next` moved to 16.3.0**, and `npm audit fix` for the rest: production advisories go from five high to zero. The CI threshold moves from `critical` to `--omit=dev --audit-level=high`, because with the old one those five passed green

---

## [1.5.0] - 2026-08-08

🔎 **SEO foundations & runtime.** The pages that matter most were the least looked after: the home page and `/pricing` had no canonical, `/pricing` had no heading at all, and structured data existed only inside blog posts. This release fixes the foundations every page stands on, moves the supported runtime to Node 24, and clears two broken-link bugs.

### Added
- **Canonical URLs** on the home page, `/pricing`, `/blog` and `/docs`. Until now only blog posts had one, and it is the protection that matters most when a demo deployment mirrors the site it showcases. All of them are built from `NEXT_PUBLIC_APP_URL`
- **Structured data for the site**, not only for articles: `Organization`, and `FAQPage` on the home page generated from the same questions you edit in `src/components/landing/faq.tsx`, so answering them for your product updates both at once
- **An H1 on `/pricing`**, which had two H2s and no heading of its own: an error for search engines, and a page with no title for anyone using a screen reader. The pricing section takes the heading role on its own page and stays an H2 on the landing, with no visual change
- **A description of its own for `/pricing`**, which until now inherited the site-wide one and repeated the home page in search results
- `NEXT_PUBLIC_SEO_TITLE`: the title used in `<title>` and in search results. Unset, it stays `name | tagline`. Set it when the words people search for are not the claim you want readers to see, and the tagline keeps its job on the page
- `NEXT_PUBLIC_MAINTAINER_NAME` and `NEXT_PUBLIC_MAINTAINER_URL`: who builds the product, shown on the About page. The section hides when the name is unset, and the URL is optional
- **`npm audit` in CI**, set at `critical`. It runs last on purpose: a new advisory is not a defect of the commit being tested, so it must never hide the result of lint, tests and build
- A **SEO section** in `docs/configuration.md`, covering what the kit already does on its own and the one variable you have to set in production

### Changed
- **Node 24 is the supported runtime**, now declared in `engines`, which the kit never did before. Node 20 reached end of life in April 2026. The code still runs on it, so nothing breaks today: what changed is the version we support and test against
- **TypeScript 6.** Not 7, which Next.js does not yet support without an experimental flag that would end up in your project too
- GitHub Actions updated from v4 to v7, and `@types/node`, `@types/react`, `@types/react-dom` and `@types/pg` moved up

### Fixed
*Both of these have been on `main` since 3 August and are already live on the showcase, but they were never part of a tagged release. If you cloned at `v1.4.1` you do not have them, so they are listed here.*

- **Relative links on the changelog page returned 404.** The docs pages already translated links written for the repository, the changelog page did not, so `./docs/blog.md` and `./README.md` were dead ends. That logic now lives in `src/lib/markdown-links.ts` and both pages use it, taking the file's own directory into account: the same href means different things from `docs/` and from the root
- **Anchor links landed on the right page and the wrong section.** A heading like "Branding & theming" becomes `branding--theming` on GitHub and `branding-theming` here. Anchors are now translated for links that stay on the site, and left alone for links that point at GitHub

### Notes
- No database migration. Every new variable is optional, and with none of them set the kit behaves exactly as before
- **Set `NEXT_PUBLIC_APP_URL` in production.** Canonical URLs are built from it, and unset it falls back to `localhost`, which is worse than having no canonical at all

## [1.4.1] - 2026-08-03

🔒 **Security patch.** Auth.js moves up to clear a critical advisory, together with the first weekly batch of dependency updates.

### Security
- **Critical advisory in `@auth/core`** (up to and including 0.41.2): a malformed `Authorization: Bearer` header makes `getToken()` throw an uncaught exception. Cleared by moving to `next-auth@5.0.0-beta.32` and `@auth/prisma-adapter@2.11.3`, which pin `@auth/core@0.41.3` between them, so a single copy is installed instead of two. **If you cloned before this release, pull and run `npm install`**
- `npm audit` is now clear of every advisory that has a real fix. What remains lives inside Next.js's own dependency tree (`postcss`, `sharp`) and clears when Next ships an update, not when you run `npm audit fix`: see [Security](./README.md#-security)

### Changed
- Dependencies updated: Next 16.2.12, React 19.2.8, Prisma 7.9.1, Stripe 22.4.0, Resend 6.18.1, Radix UI and lucide
- **Stripe API version** moved from `2026-05-27.dahlia` to `2026-07-29.dahlia` to match the SDK. If you pinned the previous one deliberately, `src/lib/stripe.ts` is the line to change back
- The README no longer advertises "0 High/Critical audit". A count like that is a snapshot that goes stale on its own, so it now describes the practice instead of a number

### Notes
- No database migration, no new environment variables
- The dependency updates arrived as five grouped Dependabot pull requests. Two failed CI, and both were real: the Auth.js split above, and the Stripe API version. This is what the test suite added in 1.4.0 is for

## [1.4.0] - 2026-08-03

🧪 **Testing & Trust.** The kit now proves itself: unit, integration and end-to-end tests, environment validation that stops a half-configured deployment at boot instead of at the first payment, a health endpoint with a release smoke that catches a deploy serving the previous build, and grouped dependency updates. Public demos reset themselves on a schedule, and the kit ships looking more like an example to rewrite and less like our product.

### Added
- **Test suite**: Vitest over the logic in `src/lib` (rate limiter, password policy, the blog, docs and changelog parsers, the environment schema, the pure parts of billing) plus the two routes worth guarding. The Stripe webhook is exercised with **real signatures** generated by Stripe's own SDK, so a forged, tampered or replayed request is proven never to reach the database writes behind it. 82 tests, `npm test`. See [Tests](./README.md#-tests)
- **End-to-end tests**: Playwright on the two flows that cost money when they break, signing up and starting a checkout. Chromium only, and deliberately outside `npm test` and CI, because they need a database and a 115 MB browser binary that a clone should not have to install to run the unit suite. `npm run test:e2e`
- **Environment validation**: a Zod schema checked once at boot from `src/instrumentation.ts`, reporting every problem at once. It does not make variables mandatory (a fresh clone still starts with nothing but a database): it stops the configurations that are **half done**, such as a Stripe key with no webhook secret, a Resend key with no sender, half an OAuth pair, or a missing `AUTH_SECRET` in production. Bypass with `SKIP_ENV_VALIDATION="true"`
- **Health endpoint**: `GET /api/health` reports the running version, the deployed commit, the environment and whether the deployment is a demo. Uncached by design
- **Release smoke**: `npm run smoke -- <url> [--expect-version 1.4.0]`, ten read-only checks against a live deployment, including the version comparison that catches a deploy which reported success while still serving the previous build. Every request is a GET, so it is safe against production
- **Coverage**: `npm run test:coverage`, with the current figures and the reasoning about coverage badges documented in the README
- **Dependabot**: weekly npm updates grouped by area (Next, React, Prisma, UI, everything else) so they arrive as a handful of pull requests instead of a dozen, majors one at a time, GitHub Actions monthly. Cadence documented in the README
- **Demo auto-reset**: a daily Vercel cron at 04:00 UTC reseeds a public demo so shared accounts stop drifting, behind two independent guards (`DEMO_MODE` must be `"true"`, `CRON_SECRET` must match, and an unset secret refuses rather than defaults to open)
- **`.vercelignore`**: keeps `.env*` and the dependency tree out of CLI deploys. Note that when this file exists Vercel uses it *instead of* `.gitignore`, not in addition to it

### Changed
- CI now runs the test suite alongside lint and build, on every push and pull request to `main`
- **The logo mark ships as a plain hexagon**, and the favicon is generated as its miniature so the two always match. The bolt was our symbol, and a clone should not ship wearing it
- **The example landing is smaller on purpose**: 6 feature cards instead of 9, 4 FAQ entries instead of 6, each covering a different area. They read better as something to rewrite than as a finished feature list to inherit
- The dashboard and admin shells now use the same maximum width as the public pages, so cards stop stretching to the full width of a large screen
- The waitlist copy no longer promises a weekly email, in the app and in the roadmap alike. A cadence written in a welcome email is one the subscriber keeps in their inbox: promise news, then send news
- `SECURITY.md` and `.github/FUNDING.yml` are no longer part of the kit. They pointed at our security contact and our tip jar, which is wrong the moment the repository is yours. Reports about the kit itself go through [our security policy](https://github.com/baonguyenyam/lessgap-sass-module/security/policy); for your app, write your own

### Fixed
- **Unknown URLs rendered the sign-in redirect instead of a 404.** The proxy went from an allowlist of public routes to a denylist of private ones, so a typo like `/doc` reaches the router and your 404 page. Nothing is opened up: every private area already gates itself server-side
- **The docs index turned `## DATABASE_URL` into "DATABASEURL"**, on documentation that explains 34 environment variables. Underscores are now stripped only where CommonMark treats them as emphasis. Verified across all 58 real headings: no published anchor changes
- **The admin waitlist table overflowed on mobile**, dragging every card off screen with it. It now falls back to cards below `md`, and the two shell layouts get `min-w-0` so a wide child scrolls inside its own container instead of stretching the whole column
- **Demo deployments are no longer indexable**: `noindex` on the demo, an empty sitemap and no `Sitemap:` line in `robots.txt`, so a demo cannot compete with the site it showcases
- The kit's own site listed `/terms` and `/cookies` in its sitemap while its footer deliberately hid both, submitting placeholder pages for indexing. Your app still ships all three pages

### Notes
- No database migration in this release
- Env: new optional `CRON_SECRET`, only meaningful on a demo deployment
- New dev dependencies: `vitest`, `@vitest/coverage-v8`, `@playwright/test`

## [1.3.0] - 2026-07-24

📝 **Content & SEO.** A file-based blog, technical SEO, a pre-launch waitlist and a spam-safe contact form. The kit now ships agent instructions so your AI assistant is productive on day one, and goes fully brand-neutral so rebranding is one config or env away.

### Added
- **Theming and instant rebrand**: the kit now ships brand-neutral, with a placeholder name and a clean black + grayscale theme. Make it yours from `src/config/site.ts` and the color tokens in `globals.css`, or set the new `NEXT_PUBLIC_BRAND_*` env vars to change name, logo accent and colors with no code changes. The gradient, glow, Open Graph images and emails all follow your accent automatically. See [Configuration](./docs/configuration.md#branding--theming)
- **Blog**: file-based MDX blog at `/blog` with categories, per-category pages, an RSS feed at `/blog/rss.xml`, reading time, optional cover images and draft support. Writing a post is a Markdown file and a commit, no database. Six example posts included. See the [blog guide](./docs/blog.md)
- **Newsletter waitlist**: double opt-in signup (Zod + honeypot + per-IP and per-email rate limit), branded confirmation and welcome emails, one-click unsubscribe, optional Resend Audience sync for sending Broadcasts, and an admin view with counts and a CSV export that doubles as the consent record. Powers the Pro pre-launch waitlist on the pricing page. See the [newsletter guide](./docs/newsletter.md)
- **Contact form**: `/contact` with Zod validation, a honeypot, per-IP rate limiting and a privacy notice, delivered to the owner via Resend with the sender set as reply-to
- **Technical SEO**: `sitemap.xml` and `robots.txt` generated from the real routes and blog content, dynamic Open Graph images for pages and posts (`next/og`), and Article JSON-LD on posts
- **Marketing pages**: an `/about` scaffold and the `/contact` page, linked from the navbar and footer
- **AI-ready**: ships agent instructions for Claude Code, Cursor and Copilot, with `AGENTS.md` as the single source and `.cursor/rules/` and `.github/copilot-instructions.md` pointing to it
- **Shared rate limiter**: `checkRateLimit` gains a per-IP key helper and now guards the newsletter, contact and signup endpoints

### Changed
- The Pro pricing card now opens the waitlist signup instead of a mailto contact link
- Blog and Contact added to the navbar and footer navigation

### Notes
- One additive migration: `add_newsletter_subscriber`; run `npx prisma migrate deploy`
- Env: new optional `RESEND_AUDIENCE_ID` for the newsletter Audience sync (the database list works without it)
- New dependencies: `next-mdx-remote` and `gray-matter` for the blog

## [1.2.0] - 2026-07-16

💳 **Payments & polish.** The billing pillar is complete: one-time payments, multiple tiers, usage-based example. Plus onboarding and a public changelog.

### Added
- **One-time payments**: Stripe Checkout in `payment` mode with a new `Purchase` model, idempotent webhook handling (replay-safe on the PaymentIntent), refund handling via `charge.refunded`, purchase confirmation email, and invoices enabled on one-time checkouts
- **Multiple pricing tiers**: plan cards are driven by the `Plan` table; monthly and yearly variants of a tier pair up into one card (by slug convention) and the Monthly/Yearly toggle swaps only the price, animated and always shown as its monthly equivalent with a "billed yearly" note; the seed now ships 6 example plans (Starter and Pro in monthly and yearly variants, Lifetime, and an inactive metered example)
- **Usage-based billing example**: `recordUsage()` helper on Stripe Billing Meters, plus a new [billing guide](./docs/billing.md) covering subscriptions, one-time payments, usage-based metering and local testing
- **Onboarding**: a dismissable "Get started" checklist on the dashboard (items derived live from your data) and toasts on return from Stripe Checkout (success and canceled)
- **Public `/changelog` page**: this file rendered on the site with a version badge per release, linked in the navbar (after Docs) and in the footer
- **Demo pricing triad**: in demo mode the homepage, `/pricing` and the in-app billing grid all show the same Starter / Pro / Enterprise triad driven by the `Plan` table, closed by an example Enterprise "Contact us" card that opens the contact dialog with a pre-filled subject (`PlanCards` gains a `ctaHref` mode for public pages and an optional `contactCard` slot for a sales-led tier)
- **Session revocation**: a password reset now invalidates other active sessions within about a minute (`sessionVersion` claim with a throttled DB check)
- **Entitlement helper**: `getEntitlement()` in `src/lib/billing.ts` resolves lifetime vs subscription vs free, the pattern to copy for gating your own features

### Changed
- Checkout API hardened: valid requests require an active `Plan` price, and users with an active subscription or lifetime purchase get a clear error pointing to the Customer Portal instead of a second checkout
- The demo banner now stays pinned above the navbar while scrolling, so the "jump into the app" call to action is always visible on the demo
- Upgrade button requires an explicit price and surfaces errors as toasts
- Copy polish across the landing, dashboard, auth and legal pages

### Fixed
- Mobile menu: hash links now scroll to the section instead of bouncing
- CSS `mask` uses the standard property alongside the `-webkit-` prefix

### Notes
- Two new migrations (both additive): `add_one_time_payments` and `add_session_version_and_onboarding`; run `npx prisma migrate deploy`
- Env: new `STRIPE_STARTER_PRICE_ID`, `STRIPE_LIFETIME_PRICE_ID`, `STRIPE_METERED_PRICE_ID`; removed `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` (price IDs never needed to be public)
- Sessions issued before this release stay valid: the new session claim is backfilled without logging anyone out

## [1.1.0] - 2026-07-10

🔐 **Auth expansion & docs.** Four ways to sign in, one account. Plus a real documentation set.

### Added
- **Magic link sign-in**: passwordless one-time links by email (Resend), branded with the same template as the transactional emails, valid 15 minutes
- **Email + password**: production-grade credentials with signup, email verification via magic link, bcrypt hashing (cost 12), generic errors (no user enumeration), rate limiting
- **Password reset**: full forgot/reset flow with single-use SHA-256-hashed tokens, 30-minute expiry
- **Account linking**: automatic linking across Google/GitHub/email (verified-email providers), plus a "Sign-in methods" card in Settings to connect/disconnect providers and set or change the password, with a lock-out guard
- **Auth pages**: new `/signup`, `/verify-request`, `/forgot-password`, `/reset-password`
- **Documentation**: new `docs/` folder (getting started, configuration, authentication, deployment), rendered on the site at `/docs` with sidebar navigation; the Markdown files are the single source of truth

### Changed
- Login page now offers email + password and magic link alongside OAuth (hidden in demo mode)
- Settings page shows the real linked providers instead of a hardcoded label

### Notes
- New dependency: `bcryptjs` (pure JS, no native build steps)
- New migration: `add_password_auth` (User.passwordHash + PasswordResetToken); run `npx prisma migrate deploy`
- JWT sessions are unchanged; sessions issued before a password reset stay valid until expiry (documented in `docs/authentication.md`)

## [1.0.0] - 2026-06-25

🚀 **First public release.** The complete, production-ready SaaS core, free & open source.

### Added
- **Framework**: Next.js 16.2 (App Router, Turbopack) + TypeScript strict
- **Styling**: Tailwind CSS v4 with native CSS variables + dark mode (system detection + persist)
- **Auth**: Auth.js v5 with Google & GitHub OAuth, route protection, session management
- **Database**: Prisma 7 + PostgreSQL schema (User, Account, Session, Plan, Subscription, Project) with driver adapter
- **Payments**: Stripe Checkout, Customer Portal, and webhooks (Stripe API 2026-05-27)
- **User dashboard**: overview, billing with Stripe invoice history, profile settings (Zod-validated server actions)
- **Projects**: example single-tenant CRUD resource (schema, server actions with ownership checks, list/detail/forms)
- **Admin panel**: user list with search & pagination, MRR/users/subscriptions metrics, role management
- **Emails**: Resend transactional emails (welcome, subscription confirmation, cancellation)
- **Design system**: Radix-based components (Button, Card, Badge, Input, Table, dialog, dropdown, tabs, tooltip…) + `cn` utility
- **Landing page**: Hero, tech stack strip, Features, Pricing, FAQ, Footer
- **Security**: security headers, `SECURITY.md`, and a CI workflow (lint + build)
- **Attribution**: optional "Built with OpenStarterKit" badge, removable via env flag
- **DX**: 1-click Vercel deploy button, complete README, `.env.example`, dev-only credentials login
- **License**: MIT (use in unlimited projects, commercial included)

### Notes
- Production build: 0 TypeScript errors, 0 ESLint errors, 14 routes
- Stack chosen best-of-breed with **no vendor lock-in**: every component is swappable

[2.4.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.4.0
[2.3.7]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.7
[2.3.6]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.6
[2.3.5]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.5
[2.3.4]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.4
[2.3.3]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.3
[2.3.2]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.2
[2.3.1]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.1
[2.3.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.3.0
[2.2.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.2.0
[2.1.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.1.0
[2.0.3]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.0.3
[2.0.2]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.0.2
[2.0.1]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.0.1
[2.0.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v2.0.0
[1.7.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.7.0
[1.6.4]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.6.4
[1.6.3]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.6.3
[1.6.2]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.6.2
[1.6.1]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.6.1
[1.6.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.6.0
[1.5.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.5.0
[1.4.1]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.4.1
[1.4.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.4.0
[1.3.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.3.0
[1.2.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.2.0
[1.1.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.1.0
[1.0.0]: https://github.com/baonguyenyam/lessgap-sass-module/releases/tag/v1.0.0
