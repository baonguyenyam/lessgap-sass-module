# Vision

**Status:** `draft`

## What we sell

A website and the tools to run it, as a subscription, to local service
businesses in the United States. We are a web design company first: every
paying tenant gets a site our designers made for them. What the platform adds
is that the business can keep it current without calling us, and can take
bookings, orders and payments through it.

The comparison with Neon or Supabase holds for the shape, not the product: an
operator console over many isolated tenants, plans that switch capabilities on
and off, self-service where it is safe and staff-assisted where it is not.

## Who buys

| Vertical | What they need first | What they pay for later |
| --- | --- | --- |
| Nail salon, barber, hair salon, spa | Service menu with prices, online booking by staff member, reminders | Deposits, gift cards, retail shop, chatbot in several languages |
| Restaurant | Menu with prices, hours, location, table reservations | Online ordering for pickup, catering quotes |
| Dental, small clinic | Services, team, hours, appointment requests | Insurance info pages, intake forms (see compliance) |
| Generic local service | Business info, services, quote requests | Booking, payments |

Many owners in the first two rows run their business in Vietnamese or
Spanish; their customers mostly use English. The dashboard therefore needs
`vi` early, and sites need more than one language as a plan feature.

## Actors

| Actor | Where they work | What they can do |
| --- | --- | --- |
| Platform staff | `app.lessgap.app/platform` | Everything across tenants: plans, switches, themes, impersonation, support |
| Tenant owner | `app.lessgap.app/t/<slug>` | Everything inside their tenant, including billing and members |
| Tenant manager | same | Content, services, bookings, orders. Not billing or members |
| Tenant staff | same | Their own calendar and assigned bookings |
| Customer | the tenant's site | Browse, book, buy, ask for a quote, chat |
| Visitor | `lessgap.app` | Our marketing site, pricing, signup |

## Principles

1. **Isolation before features.** A record shown to the wrong tenant is the
   one bug we cannot apologise our way out of. Every phase keeps the isolation
   tests green before it adds anything. See [tenancy.md](./02-tenancy.md).
2. **One way to do each thing.** One entitlement check, one tenant context, one
   module structure, one way to send a notification. A second way is a defect
   even when it works. See [architecture.md](./01-architecture.md).
3. **Configuration over forks.** A difference between tenants is data (plan,
   switches, settings, vertical preset) unless it is design, which is a theme.
   Never `if (tenant.slug === "...")`.
4. **Owners manage content, we manage design.** The dashboard edits data, not
   layout. Owners never see a page builder.
5. **Small, verifiable phases.** Each phase in [roadmap.md](./roadmap.md) ends
   in something deployable and tested.

## Non-goals (for now)

- A drag-and-drop page builder. Themes are code.
- Running tenant code or tenant-supplied HTML or scripts.
- A POS, payroll, inventory or accounting system. We integrate where needed.
- Storing clinical records or anything that makes us a HIPAA business
  associate. See [security-compliance.md](./10-security-compliance.md).
- A dedicated deployment per tenant. Everyone shares one deployment and one
  database until a contract justifies otherwise.
- Native mobile apps. The dashboard is a responsive web app.

## Open questions

- Which payment models to launch with. See [billing.md](./05-billing.md).
- Whether existing Madelab clients migrate in, and how their current sites map to themes.
