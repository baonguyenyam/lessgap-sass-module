# Modules

**Status:** `draft`

Every module follows the folder shape in [architecture.md](./01-architecture.md#module-folder-shape),
declares its features in its `module.ts`, and is listed in `src/modules/registry.ts`.
The phase column refers to [roadmap.md](./roadmap.md).

| Module key | What it is | Core feature key | Phase |
| --- | --- | --- | --- |
| `site` | Business profile, hours, contact, social, SEO, pages, sections, languages | always on | 3 |
| `media` | Image library per tenant, used by every other module | always on | 3 |
| `catalog` | Services with categories, durations, prices, variants | always on (limit on free) | 4 |
| `team` | Staff profiles shown on the site and used by booking | always on | 4 |
| `booking` | Appointments for services with staff and resources | `booking` | 5 |
| `reservations` | Restaurant table reservations | `reservations` | 5 |
| `customers` | The tenant's customer list, built from bookings, orders, quotes | always on | 5 |
| `notifications` | Email and SMS to customers and members, with templates | always on (SMS gated) | 5 |
| `payments` | Stripe Connect onboarding, payments, refunds, payouts view | `payments.connect` | 6 |
| `shop` | Products, cart, checkout, orders, pickup or shipping | `shop` | 6 |
| `ordering` | Restaurant menu ordering for pickup, built on `shop` | `ordering` | 6 |
| `quotes` | Quote requests, priced quotes, acceptance, conversion | `quotes` | 6 |
| `chatbot` | Retrieval-augmented assistant on the site | `chatbot` | 7 |
| `analytics` | Visits, bookings, revenue per tenant | `analytics` | 8 |

## site

- **Data:** `Site` (tenant, themeKey, tokens JSON, sections JSON, languages,
  primary domain, status), `SiteSettings` (name, tagline, phone, email,
  address, geo, hours by weekday, holiday closures, social links, policies),
  `Page` (key, title, SEO fields, body per language for free-text pages).
- **Dashboard:** Company profile; Hours and closures; Pages and SEO; Appearance
  (tokens the theme exposes); Sections (show or hide optional ones); Languages.
- **Site:** every theme page reads `SiteData`. LocalBusiness JSON-LD built from
  the same settings the page shows (AGENTS.md rule).
- **Gates:** `site.languages.max`, `site.badge.removable`, `site.pages.custom.max`.

## media

- **Data:** `Media` (tenantId, storage key `tenants/<tenantId>/...`, alt text
  per language, dimensions, size). Alt text is required to publish.
- **Gates:** `media.storage.mb`.
- Uploads go through a signed URL scoped to the tenant prefix; the server
  checks type and size before signing and again after upload.

## catalog

- **Data:** `ServiceCategory`, `Service` (name, description, duration,
  price or price range or "from" price, `isBookable`, `isVisible`, sort,
  image), `ServiceVariant` (e.g. length or add-on with its own duration and price).
- **Dashboard:** list by category, drag to reorder, bulk edit prices, show or
  hide, duplicate.
- **Site:** price list section, service detail, "Book this" when `booking` is on.
- **Gates:** `catalog.services.max`.
- Prices are integers in cents with a currency on the tenant. "Price on
  request" is a state, not a zero.

## team

- **Data:** `StaffMember` (display name, photo, bio, services they perform,
  working hours, optional link to a `Member` login).
- **Dashboard:** the tenant's Teams page manages staff profiles; a staff member
  does not need a login and is separate from tenant membership and roles.
- Linking a staff member to a `Member` lets them see their own calendar.

## booking

- **Data:** `Resource` (chair, room, station), `AvailabilityRule` (weekly
  hours per staff and per resource), `TimeOff`, `Appointment` (customer,
  service or variant, staff, resource, start, end, status, source, notes,
  deposit payment), `AppointmentEvent` (status history).
- **Statuses:** `requested` → `confirmed` → `completed`, with `canceled` and
  `no_show`. Tenants choose instant confirmation or manual approval.
- **Availability** is a pure function: `availableSlots(rules, timeOff,
  existingAppointments, service, staff?, range, tz)`. It is the most tested
  code in the project: daylight saving changes, overlapping buffers, "any
  staff", last slot of the day, closures, minimum notice, maximum advance.
- **Double booking** is prevented in the database, not only in code: an
  exclusion constraint on `(staffId, tstzrange(start, end))` for non-canceled
  appointments, and the same for resources.
- **Customer flow on the site:** service → staff (or any) → time → details →
  deposit if required → confirmation with calendar file and manage link.
- **Reminders:** email by default, SMS when entitled and consented, at times
  the tenant sets (default 24 h and 2 h).
- **Gates:** `booking`, `booking.staff.max`, `booking.monthly`,
  `booking.deposits`, `booking.sms_reminders`, `booking.manual_approval`.
- All times are stored in UTC with the tenant's IANA time zone on the tenant;
  display converts.

## reservations

- **Data:** `Table` (capacity, area), `ReservationRule` (service periods,
  party size range, slot length, turn time), `Reservation`.
- Kept separate from `booking` because the unit is a party and a table, not a
  service and a staff member. They share the time utilities and notifications.

## customers

- **Data:** `Customer` (tenantId, name, email, phone, language, marketing
  consent with timestamp and source, SMS consent likewise), linked to
  appointments, orders, quotes.
- Deduplicated within the tenant by email, then by phone.
- **Export and delete** per customer, for privacy requests.
- Customers are never shared or searchable across tenants.

## notifications

- One sender: `notify(ctx, template, recipient, data)`. Modules never call
  Brevo, SES or Twilio directly; email goes through `sendEmail()` (ADR 0009).
- Templates per tenant with defaults per vertical and language; the platform
  name never appears in tenant-to-customer messages unless the plan requires the badge.
- Every message logged in `NotificationLog` with status from provider webhooks.
- SMS only with recorded consent, with STOP handling (see compliance).

## payments

See [billing.md](./05-billing.md). Owns connected-account onboarding state,
`Payment`, `Refund`, and the payouts view. Other modules ask it to create a
checkout or payment intent; none of them talk to Stripe directly.

## shop

- **Data:** `ProductCategory`, `Product` (type `physical | digital | gift_card
  | menu_item`), `ProductVariant`, `Order`, `OrderLine`, `Cart` (anonymous by
  cookie, then attached to a customer).
- **Fulfilment:** pickup (with time slots) or shipping (flat or by weight,
  per tenant). Tax via Stripe Tax when the tenant enables it.
- **Gates:** `shop`, `shop.products.max`, `shop.shipping`, `shop.gift_cards`.

## ordering

- Restaurant pickup ordering. Reuses `shop` products of type `menu_item` with
  modifiers (`ProductModifierGroup`, `ProductModifier`), plus pickup time slots
  and kitchen capacity per slot. Order status board in the dashboard.
- **Gates:** `ordering`, requires `shop` internally but is sold as its own feature.

## quotes

- **Data:** `QuoteRequest` (form answers from a per-tenant form definition),
  `Quote` (lines, total, valid until, terms), `QuoteEvent`.
- **Flow:** customer submits request → tenant prices it → customer gets a link
  → accepts (and pays a deposit if set) → converts to an order or appointment.
- Request forms are a small schema-driven form definition per tenant
  (text, number, select, date, file), not free HTML.
- **Gates:** `quotes`, `quotes.monthly`, `quotes.online_acceptance`.

## chatbot

See [chatbot-rag.md](./08-chatbot-rag.md).

## analytics

Per-tenant counts the platform already has (bookings, orders, revenue,
quote conversion) plus page views from a privacy-friendly counter. No
third-party trackers by default; tenants on higher plans may add their own
GA4 or Meta pixel id, rendered with consent.

## Cross-module rules

- A module reads another module's data only through that module's
  `server/index.ts`. Booking asks `catalog` for a service; it does not query
  the `Service` table.
- Events between modules go through `emit(ctx, "booking.appointment.confirmed", payload)`
  and subscribers registered in `module.ts`. Notifications, analytics and the
  chatbot's re-index subscribe; the emitting module does not know who listens.
- Turning a module off hides it everywhere and stops its jobs. It never deletes data.
