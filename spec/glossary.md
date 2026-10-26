# Glossary

Use these words, and only these, in code, schema, UI and docs. A second word
for the same thing is how a codebase starts to drift.

| Term | Code name | Meaning |
| --- | --- | --- |
| Platform | `platform` | Us, the operator, and everything we run |
| Platform staff | `PlatformRole` | Our employees. Roles: `owner`, `admin`, `support`, `designer` |
| Tenant | `Tenant` | One business that buys a plan. Owns one site and all its data |
| Member | `Member` | A user who belongs to a tenant, with a tenant role: `owner`, `manager`, `staff` |
| Customer | `Customer` | A person who uses a tenant's site: books, buys, asks for a quote. Not a platform user |
| Site | `Site` | The public website of a tenant. One per tenant in v1 |
| Vertical | `verticalKey` | The industry preset a tenant starts from: `barber`, `nail_salon`, `restaurant`, `dental`, `spa`, `generic` |
| Theme | `themeKey` | A registered set of React components that renders a site |
| Custom theme | `theme kind: custom` | A theme built for one tenant by our designers |
| Module | `ModuleKey` | A business capability that can be switched on or off: `booking`, `shop`, `quotes`, `chatbot`, … |
| Feature | `FeatureKey` | Something a plan grants: a module, a capability inside one, or a limit |
| Entitlement | `Entitlements` | The resolved set of features and limits a tenant has right now |
| Platform switch | `PlatformSwitch` | A global setting that applies to all tenants: signups open, free plan offered, maintenance |
| Plan | `Plan` | What a tenant subscribes to. Grants features and limits |
| Add-on | `AddOn` | A feature or extra limit bought on top of a plan |
| Override | `EntitlementOverride` | A per-tenant grant or revoke made by platform staff |
| Limit | `LimitKey` | A numeric entitlement: `staff.max`, `bookings.monthly`, `chatbot.messages.monthly`, … |
| Usage | `UsageCounter` | How much of a limit a tenant has consumed in the current period |
| Service | `Service` | Something a tenant sells by time: haircut, manicure, cleaning, consultation |
| Resource | `Resource` | What a booking occupies besides staff: a chair, a room, a table |
| Appointment | `Appointment` | A booking of a service at a time, for a customer |
| Reservation | `Reservation` | A restaurant table booking. Separate from appointments on purpose |
| Product | `Product` | Something a tenant sells as an item: retail goods, gift cards, menu items for ordering |
| Order | `Order` | A purchase of products by a customer |
| Quote | `Quote` | A priced proposal a customer asked for, which can become an order or appointment |
| Connected account | `stripeAccountId` | A tenant's Stripe Connect account, which receives their customers' payments |
| Application fee | `applicationFee` | What the platform keeps from a payment a tenant receives |
| Knowledge source | `KnowledgeSource` | Content the chatbot may answer from |
| Primary domain | `Domain.isPrimary` | The hostname a site is served on; every other hostname redirects to it |
