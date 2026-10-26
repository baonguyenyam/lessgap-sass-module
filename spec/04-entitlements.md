# Platform switches, plans and entitlements

**Status:** `draft`

This is how "turn anything on or off, for everyone or per plan or per tenant"
works. There is one resolver and one way to ask it. Nothing else decides
whether a tenant may use something.

## Five layers, evaluated in order

```
1. Platform switch     is this available on the platform at all right now?
2. Plan                does the tenant's plan include it, and how much?
3. Add-ons             did the tenant buy it on top?
4. Override            did platform staff grant or revoke it for this tenant?
5. Tenant setting      did the tenant turn it on for their site?
   then
6. Role permission     may this member do it?
```

- 1 can only remove. A switch that is off wins over every plan and override
  (except overrides marked `ignoresSwitch`, used for beta testers).
- 2–4 produce the **entitlement**: what the tenant *may* use, and the limits.
- 5 is the tenant's choice inside what they may use (a salon on a plan with
  the shop may still keep the shop hidden).
- 6 is per member (see [tenancy.md](./02-tenancy.md)).

## The feature registry

Every feature is declared once, in code, in the module that owns it, and
collected by `src/platform/entitlements/registry.ts`. A key that is not in the
registry does not type-check.

```ts
// src/modules/booking/module.ts
export const bookingFeatures = defineFeatures({
  "booking":                 { kind: "module",  label: "Online booking" },
  "booking.deposits":        { kind: "boolean", label: "Deposits at booking", requires: ["payments.connect"] },
  "booking.sms_reminders":   { kind: "boolean", label: "SMS reminders" },
  "booking.staff.max":       { kind: "limit",   label: "Bookable staff", unit: "staff" },
  "booking.monthly":         { kind: "limit",   label: "Bookings per month", unit: "bookings", period: "month" },
})
```

- `module` features gate a whole module: navigation, routes, site blocks, jobs.
- `boolean` features gate a capability inside a module.
- `limit` features are numbers; `null` means unlimited, `0` means not included.
  Limits with a `period` are metered with `UsageCounter`.
- `requires` lists features that must also be on. The resolver turns a feature
  off when a requirement is off, and the platform console shows why.

Labels are translation keys in practice; shown here as text for readability.

## Asking the question

Three functions. Code uses these and nothing else.

```ts
const ent = await getEntitlements(ctx)          // cached per tenant
ent.has("booking.deposits")                      // boolean
ent.limit("booking.staff.max")                   // number | null

await requireFeature(ctx, "shop")                // throws FeatureNotAvailable → 404 on routes, typed error in actions
await consumeLimit(ctx, "chatbot.messages.monthly", 1)   // atomic; throws LimitReached
```

- Server actions and services call `requireFeature` / `consumeLimit` before
  they act. Hiding a button is not a check.
- Navigation, dashboard pages and site blocks read `ent.has` to decide what to
  render, from the same resolved object.
- `consumeLimit` increments `UsageCounter` in the same transaction as the
  write it guards, with a conditional update, so two requests cannot both take
  the last unit.
- Lowering a limit never deletes data. Over-limit tenants keep what they have,
  cannot add more, and see why.

## Platform switches

Global settings in the `PlatformSwitch` table, edited in **Platform →
Settings**, cached and invalidated on save. Initial set:

| Key | Type | Effect |
| --- | --- | --- |
| `signup.enabled` | boolean | Self-service signup on the marketing site |
| `signup.free_plan.enabled` | boolean | Free plan offered at signup and on pricing |
| `signup.require_approval` | boolean | New tenants wait in `provisioning` until staff approve |
| `signup.verticals` | string[] | Verticals offered in onboarding |
| `maintenance.dashboard` | boolean | Dashboard read-only with a banner |
| `maintenance.sites` | boolean | Sites show maintenance page (emergency only) |
| `feature.<featureKey>` | boolean | Kill switch for one feature on the whole platform |
| `chatbot.provider` | enum | Which LLM provider is active |

## Plans

Plans are rows in `Plan`, edited in **Platform → Plans**, each with a map of
feature values. Changing a plan affects every tenant on it at once, so the
console shows how many tenants a change touches before saving. A plan can be
`public` (on the pricing page), `unlisted` (assignable by staff only) or
`archived` (no new tenants; existing keep it).

Starting catalogue, values to be decided with sales:

| Feature | Free | Starter | Growth | Pro |
| --- | --- | --- | --- | --- |
| Site with a shared template | ✓ | ✓ | ✓ | ✓ |
| Custom theme by our designers | — | ✓ | ✓ | ✓ |
| `<slug>.<sites-domain>` | ✓ | ✓ | ✓ | ✓ |
| `domain.custom` | — | 1 | 2 | 5 |
| Platform badge in footer | required | removable | removable | removable |
| Business info, hours, gallery | ✓ | ✓ | ✓ | ✓ |
| Services and price list | 10 items | ✓ | ✓ | ✓ |
| `booking` | — | ✓ | ✓ | ✓ |
| `booking.staff.max` | — | 3 | 10 | — (unlimited) |
| `booking.sms_reminders` | — | — | ✓ | ✓ |
| `booking.deposits` | — | — | ✓ | ✓ |
| `reservations` (restaurants) | — | ✓ | ✓ | ✓ |
| `shop` | — | — | ✓ | ✓ |
| `ordering` (restaurant pickup) | — | — | ✓ | ✓ |
| `quotes` | — | ✓ | ✓ | ✓ |
| `chatbot` | — | — | ✓ | ✓ |
| `chatbot.messages.monthly` | — | — | 1,000 | 5,000 |
| `site.languages.max` | 1 | 1 | 2 | 4 |
| `members.max` | 1 | 3 | 10 | — |
| `payments.application_fee_bps` | — | 300 | 200 | 100 |

## Overrides

Staff can grant, revoke or change any feature for one tenant, with a reason
and an optional expiry date (trials, goodwill, a negotiated contract). Every
override is visible on the tenant's page in the console and written to the
audit log. Expired overrides stop applying without anyone deleting them.

## Required tests

- Unit: the resolver for every layer combination, including `requires` chains,
  switch off beating override on, expired overrides ignored.
- Unit: every feature key used in code exists in the registry (type-level, plus
  a test that walks module manifests).
- Integration: `consumeLimit` under concurrency never exceeds the limit.
- E2E: a tenant downgraded from Growth to Starter loses the shop on the site
  and in the dashboard, keeps its products, and sees an upgrade prompt.
