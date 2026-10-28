# Phase 2 — Plans, entitlements, platform billing

**Status:** draft
**Roadmap:** [roadmap.md#phase-2--plans-entitlements-platform-billing](../roadmap.md)
**Read first:** [entitlements.md](../04-entitlements.md), [billing.md](../05-billing.md), [module-system.md](../15-module-system.md), [data-model.md](../09-data-model.md)

## Goal

What a tenant may use is no longer a kit-wide constant: it is resolved per
tenant from five layers — platform switch, plan, add-ons, staff overrides,
then the tenant's own setting — through one feature registry and three
functions (`getEntitlements`, `requireFeature`, `consumeLimit`) with an atomic
`UsageCounter`. Staff manage switches, plans and per-tenant overrides from the
platform console, all audited. The kit's Stripe billing belongs to the tenant,
not the user: plans carry feature maps and a free plan exists without a
Stripe subscription, add-ons and setup fees work, and `past_due` becomes a
grace period before suspension. Tenants manage their own modules in
Settings → Modules: enable, disable, export data, and schedule a purge with a
7-day grace period — the same operations exist for staff in the console.

## Out of scope

- Stripe Connect (tenant payments, application fees, payouts) — phase 6.
- Sites, themes, domains — phase 3; verticals and onboarding — phase 4.
- The modules themselves (booking, shop, chatbot…). Phase 2 ships the
  lifecycle machinery and proves it on one real module; catalogue modules
  arrive in phases 5+.
- Custom per-tenant pricing UI beyond staff-set overrides and unlisted plans.

## Decisions needed before starting

| # | Question | Options | Decision |
|---|---|---|---|
| 2-A | Which module exercises the lifecycle (L1–L10) first? | (a) `newsletter` — real tenant-owned data already exists (`NewsletterSubscriber.tenantId`); (b) a stub module whose only purpose is proving the lifecycle | (a): L-tests need real rows to count, export and purge; a stub proves less and still costs a module |
| 2-B | `Subscription`/`Purchase` re-own `userId` → `tenantId`: a user can belong to several tenants, so whose tenant gets the row? | (a) the tenant created for them by the 1.12 backfill (their own tenant, owner membership); (b) newest ACTIVE tenant | (a): the user's own tenant is the one the billing page shows |
| 2-C | Free plan shape | (a) `Plan` row with `stripePriceId` null — "free" is a plan, not an absence; (b) no row, free = no subscription | (a): spec/04's catalogue lists Free as a plan with feature values, and the resolver must read it for tenants without a subscription |
| 2-D | Grace period for `past_due` | (a) fixed 7 days in code; (b) per-plan setting with a 7-day default | (b): spec/05 says "plan setting, default 7 days" |

## Tasks

### 2.1 — Billing and entitlement schema
- **Goal:** `Plan` gains `features` (Json, validated against the registry), `visibility` (PUBLIC/UNLISTED/ARCHIVED), `setupFeeCents`, `feeModel`; `Subscription` and `Purchase` re-own to `tenantId` (`@unique` on subscription per spec/05 — one subscription per tenant); new models `AddOn`, `TenantAddOn`, `EntitlementOverride`, `UsageCounter`; everything classified in `MODEL_CLASSIFICATION` and RLS'd where tenant-owned.
- **Files:** `prisma/contract.prisma`, `src/platform/tenancy/models.ts`, migration + `scripts/backfills/2026xxxx-platform-billing-to-tenant.ts` mapping each legacy `userId` row onto the user's own tenant (decision 2-B), like the 1.12 backfill: dry-run default, `--apply`, idempotent.
- **Tests:** backfill idempotent (M4 pattern); `pnpm audit:tenancy` covers the new models.
- **Checks:** `pnpm typecheck`, `pnpm test:integration`.
- **Done when:** the migration applies and every existing `Subscription`/`Purchase` row points at a tenant the user owns.
- [x] done (one migration `20261028T1836_platform_entitlement_schema` carries it all: `AddOn`, `TenantAddOn`, `EntitlementOverride`, `UsageCounter`, `PlanVisibility`; `Plan.features`→Json map with the old text[] moved to `marketingFeatures`, `visibility`, `setupFeeCents`, `feeModel`, `stripePriceId` nullable (decision 2-C); `Subscription`/`Purchase` re-owned `userId`→`tenantId`. The re-own transform lives inside the migration as `dataTransform` steps — nullable add → UPDATE from the user's owner Member → SET NOT NULL — so no row can sit unmapped at deploy and there is no separate backfill script; the runner's own postcheck is the "every row mapped" guarantee. Deploy order matters: the 1.12 tenant-per-user backfill must run first on a database holding pre-tenancy purchases (dev DB needed 31 tenants created before the migration would apply). Callers re-keyed to the tenant: `getEntitlement(tenantId)`, billing page, checkout (`ensureTenant` first, `tenantId` in Stripe metadata), webhooks, account delete/export, admin users, demo-seed now seeds tenant+owner per user. `PlanCardData.stripePriceId` became `string | null` — a free plan shows with a disabled checkout button until 2.7/2.8. T9 extended to the five new tenant-owned tables, `deleteTenant` deletes them explicitly.)

### 2.2 — Feature registry and the five-layer resolver
- **Goal:** `defineFeatures` + `src/platform/entitlements/registry.ts` collects every declared key; `getEntitlements(ctx)` resolves switch → plan → add-ons → override → tenant setting with `requires` chains, `ignoresSwitch` escapes and unexpired-override-only semantics; `ent.has` / `ent.limit` replace the phase-1 stand-in (layer-1 only).
- **Files:** `src/platform/entitlements/` (registry, resolver), the features declared by existing surfaces (newsletter, members, roles) move into it.
- **Tests:** unit resolver for every layer combination — switch off wins unless `ignoresSwitch`; add-on beats plan default; expired override falls through; `requires` unmet turns a feature off; `0` vs `null` limits.
- **Checks:** `pnpm typecheck`, `pnpm test`.
- **Done when:** the resolver passes the full matrix and existing `getEntitlement` callers read the real layers.
- [x] done (`resolveEntitlements(ResolveInput)` in `src/platform/entitlements/resolve.ts` evaluates the five layers in order — platform switch (`feature.<key>` can only remove), plan feature map over the registry default, add-ons (boolean OR, limit max, `null` = unlimited wins), unexpired `EntitlementOverride` (replaces outright; `ignoresSwitch` escapes the kill switch), tenant setting `feature.<key>` (can only remove) — then `requires` chains collapse dependants. `getEntitlements(ctx)` reads the real rows: subscription→plan.features, TenantAddOn→AddOn.features (active only), unexpired overrides, TenantSetting `feature.*`. The bare-`switches` call shape stays so phase-1 callers and tests keep working. `defineFeatures` lands in the registry for modules. A tenant without a subscription resolves on registry defaults — the free catalogue row becomes a plan assignment in 2.7, not a resolver special-case.)

### 2.3 — `requireFeature` and `consumeLimit` with `UsageCounter`
- **Goal:** `requireFeature(ctx, key)` throws `FeatureNotAvailable` (404 on routes, typed error in actions); `consumeLimit(ctx, key, n)` increments the period bucket inside the guarded write's transaction with a conditional update; lowering a limit never deletes data.
- **Files:** `src/platform/entitlements/` additions, `UsageCounter` queries, error types in `src/platform/errors.ts`.
- **Tests:** unit for throws and `LimitReached`; integration: two concurrent `consumeLimit` calls never exceed the limit (roadmap exit criterion).
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** the concurrency test is green and no code path can take a unit outside the transaction.
- [x] done (`consumeLimit(ctx, key, n, tx?)` in `src/platform/entitlements/usage.ts`: resolves the limit through `getEntitlements`, no-ops on `null` (unlimited), then takes `n` with one atomic `INSERT … ON CONFLICT DO UPDATE SET used = used + n WHERE used + n <= limit` — affectedRows 0 means someone else took the last unit and `limit_reached` throws. `tx` is the guarded write's transaction so counter and write commit or roll back together. Only `kind: "limit"` features with a `period` are metered (`roles.max`-style counts are not consumable); `"month"` buckets UTC months. `requireFeature` was already the 2.2 shape — `feature_unavailable`. First real consumer wired: `newsletter.exports.monthly` on the subscribers CSV export (429 over the cap). Concurrency test: 10 parallel calls on a limit of 5 take exactly 5, counter reads 5.)

### 2.4 — Platform switches page
- **Goal:** the initial switch set exists (`signup.*`, `maintenance.*`, `feature.*`, `chatbot.provider`) and staff edit `PlatformSwitch` rows in `/platform/settings` or a switches page — with the cache invalidation spec/04 requires, and an audit row per change.
- **Files:** `src/app/(platform)/platform/settings/*` (or `switches/*`), `src/platform/settings/store.ts` seed/invalidation, `src/app/actions/platform-ops.ts` (or a new switches action file).
- **Tests:** unit — a switch write re-scopes through `requirePlatformRole` and audits; integration — the new value is visible to `getPlatformSettings` on the next read.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** flipping a switch in the console takes effect without a restart and leaves an audit row.
- [x] done (`/platform/settings` lists every switch: typed registry settings (with effective values and whether a stored row differs) plus untyped rows `feature.*`/`module.*`/anything hand-written. `setPlatformSwitch` re-scopes through `requirePlatformRole`, validates typed keys against their registry schema (`parseSettingValue`), and writes `feature.*`/`module.*` as untyped JSON — anything else refused. The registry gained the spec/04 initial set: `signup.free_plan.enabled`, `signup.require_approval`, `signup.verticals`, `maintenance.dashboard`, `maintenance.sites`, `chatbot.provider`. `updateTag(PLATFORM_SETTINGS_TAG)` makes the next read wait for the new value; every write audits `platform.switch.updated`. Integration: write → `getPlatformSwitches` sees it → audit row names staff.)

### 2.5 — Platform plans page
- **Goal:** `/platform/plans` lists `Plan` rows with visibility; staff edit the feature map (validated against the registry), setup fee and visibility, and see how many tenants a change touches before saving (spec/04).
- **Files:** `/platform/plans/*`, plan actions, feature-map editor component, translations.
- **Tests:** unit — invalid feature keys and bad values refused; unlisted plan not assignable through public flows; integration — plan edit flips a tenant's resolved entitlement.
- **Checks:** `pnpm test`, `pnpm test:integration`, E2E smoke.
- **Done when:** an edited plan changes what its tenants resolve on their next read, and the save screen showed the affected count first.
- [x] done (`/platform/plans` lists every plan: name, price/interval, visibility badge, feature map, subscriber count. `updatePlan` edits visibility, `setupFeeCents` and the feature map — the map validates through `validateFeatureMap` in the registry (`unknownKey`/`badValue` name the first bad entry; a bad save writes nothing). The drawer names the subscriber count before save ("applies to the N tenants subscribed"), and the audit row carries it. Subscriber counts come from `Subscription.select("planId")` + JS count. E2E walk added to the platform ops spec.)

### 2.6 — Tenant overrides
- **Goal:** `/platform/tenants/[slug]` gains an overrides section: grant, revoke or change any feature for that tenant with a reason and optional expiry; every row is audited; expired rows stop applying without being deleted.
- **Files:** tenant detail additions, `src/app/actions/platform-tenants.ts` (or overrides file), resolver reads `EntitlementOverride` (already in 2.2).
- **Tests:** unit — reason required, expiry optional, `ignoresSwitch` honoured; integration — an override resolves then expires.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** an override visibly flips the tenant's `ent.has` for one feature and the audit log names staff, reason and expiry.
- [x] done (`/platform/tenants/[slug]` gained an "Entitlement overrides" card listing every row (feature, value, reason, expiry, ignoresSwitch badge) with a New/Edit drawer and a Revoke confirm drawer. `setEntitlementOverride` requires a declared feature, a value matching its kind and a written reason; expiry is optional; one row per tenant+feature upserts through the composite unique index (`uniqueIndexKey`). `revokeEntitlementOverride` deletes the row. Both audit `platform.override.upserted`/`revoked` with staff id + tenantId. Resolver side was already live from 2.2 — the integration test flips `ent.has` true→false, expires the row directly and watches it come back without a delete.)

### 2.7 — Tenant-owned billing: re-own, free plan, add-ons, setup fee
- **Goal:** checkout, portal, webhooks and the tenant billing page read the tenant's subscription (one per tenant); the free plan needs no Stripe subscription; add-ons sell via `AddOn`/`TenantAddOn` rows and fold into the resolver; a plan's `setupFeeCents` charges once at first checkout.
- **Files:** `src/app/(dashboard)/t/[slug]/billing/*`, `src/app/api/checkout`, `src/app/api/webhooks/stripe`, `src/lib/billing`, add-on actions.
- **Tests:** unit — free plan resolves features without a subscription row; add-on contributes its features; setup fee appears only on the first invoice. Integration — a webhook event maps to the tenant, not a user.
- **Checks:** `pnpm test`, `pnpm test:integration`; manual checkout on Stripe test mode.
- **Done when:** a tenant on the free plan gets its feature map, a paid tenant's add-on flips `ent.has`, and no billing read trusts a `userId` anymore.
- [x] done (two migrations: `platform_subscription_free_plan` drops `NOT NULL` on `Subscription.stripeSubscriptionId`; `platform_purchase_addon` adds `Purchase.addOnId`/`addOn` and makes `planId` nullable — a purchase is for a plan OR an add-on. `assignFreePlan(tenantId, plan)` in `src/lib/billing.ts` writes the tenant's subscription row `ACTIVE` with `stripeSubscriptionId: null` — the resolver does not care whether Stripe manages it, so a free-plan tenant gets its feature map. `checkoutLineItems` adds the plan's `setupFeeCents` as a one-time `price_data` item only when the tenant has no subscription row and no purchase — the fee charges once ever. Checkout POSTs `{addonId}` for a one-time add-on session; the webhook grants `TenantAddOn` + `Purchase(addOnId)` keyed on `tenantId` — `metadata.userId` is gone, billing emails go to the tenant's owner member via `tenantOwner()`. Lifetime purchases filter `addOnId: null` so an add-on never reads as a plan. Billing page lists add-ons with Buy/Owned states.)

### 2.8 — Pricing and signup respect the switches
- **Goal:** the public pricing page lists only `PUBLIC` plans; `signup.free_plan.enabled` off removes the free plan from pricing and signup; `signup.enabled` off closes self-service signup; `signup.require_approval` leaves new tenants in `provisioning` for staff.
- **Files:** `src/app/[locale]/pricing`, signup flow, `src/platform/tenancy/ensure-tenant` (approval gate), nav/CTAs.
- **Tests:** E2E — switching `signup.free_plan.enabled` off removes the free plan from pricing and signup (roadmap exit criterion); `signup.enabled` off refuses a new signup.
- **Checks:** `pnpm test`, E2E on a fresh build.
- **Done when:** the switches visibly gate the public surface without a redeploy.
- [x] done (pricing reads `visibility: "PUBLIC"` only and drops the free plan — `stripePriceId: null`, `price: 0` — when `signup.free_plan.enabled` is off; `signup.enabled` off was already the `/signup?error=closed` gate. `ensureTenant` assigns the free plan via `assignFreePlan` when the switch is on, and `signup.require_approval` leaves the tenant PROVISIONING — `resolveTenantMember` treats any non-ACTIVE status as `not_found` — until staff flip it in the console with `setTenantStatus`. `createOrganization` now passes `userId` directly (system action, like `createTenantFor`), which also made `ensureTenant` callable outside a request. E2E covers the pricing flip; integration covers all three switches.)

### 2.9 — `past_due` grace period and suspension
- **Goal:** a subscription that goes `past_due` starts the plan's grace period (decision 2-D); when it lapses the tenant suspends the same way staff suspension does (`resolveTenantMember` → 404); recovering payment reactivates it. Owner sees a billing banner during grace.
- **Files:** webhook handler, `resolveTenantMember` (or a `suspendedAt`/`graceUntil` on Tenant — decide in the task), banner component, actions.
- **Tests:** integration — webhook `past_due` at T, tenant still works at T+grace-1, 404 at T+grace; recovery clears it.
- **Checks:** `pnpm test:integration`.
- **Done when:** the timeline is covered end-to-end without manual dates in the test.
- [x] done (`platform_past_due_grace` adds `Plan.gracePeriodDays` and `Tenant.graceUntil`. The webhook's `PAST_DUE` mapping — `subscription.updated` and `invoice.payment_failed` — moves the tenant to `PAST_DUE` until `now + gracePeriodDays`; `resolveTenantMember` lets a PAST_DUE tenant through while `graceUntil` is future, and the first request after it lapses writes `SUSPENDED` — the same row a staff suspension produces. `active` reactivates; `subscription.deleted` suspends outright. `getEntitlements` grants plan features only while the subscription is live (`CHECKOUT_BLOCKING_STATUSES`), so a PAST_DUE plan still resolves during grace and a CANCELED one stops. The owner sees an amber banner over the dashboard during grace; `gracePeriodDays` is editable on `/platform/plans`.)

### 2.10 — Settings → Modules lifecycle (L1–L10)
- **Goal:** a tenant's Settings → Modules page lists registry modules with enable, disable, export data and scheduled delete (7-day grace, typed-name confirm, cancel link email); the platform console mirrors the same operations. The first real module through it is the decision-2-A pick.
- **Files:** `src/app/(dashboard)/t/[slug]/settings/modules/*`, `src/platform/modules/` runtime (onEnable/onDisable/describeData/onExport/onPurge), purge job kind in `JOBS`, console `/platform/modules`, export route, translations.
- **Tests:** the L1–L10 catalogue: enable idempotent (L1), disable hides nav/routes/jobs and keeps data (L2), dependency refusal (L3), purge refused while enabled (L4), typed-name + counts + audit (L5), cancel in grace (L6), purge only after `runAfter` and only this tenant's rows (L7), interrupted purge re-runs cleanly (L8), export is this tenant's rows and expires (L9), every module implements the three hooks (L10 contract test).
- **Checks:** `pnpm test`, `pnpm test:integration`, E2E walk of enable → disable → purge → cancel → purge.
- **Done when:** all ten L-tests are green on a real module and the purge job is the only writer of module deletions.
- [ ] done

## Exit criteria

- Resolver unit tests pass for every layer combination (2.2).
- The `consumeLimit` concurrency test never exceeds the limit (2.3).
- E2E: `signup.free_plan.enabled` off removes the free plan from pricing and signup (2.8); a downgrade hides a feature without deleting data (2.10, L2).
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

- Phase 1 → 2 carry-overs already in the brief: `entitlements/index.ts` resolves layer 1 only (stand-in, 1.8b findings) — 2.2 replaces it; `feature.*` switches have no console editor — 2.4 adds it; `roles.max` currently a platform default of 10 — 2.5 makes it a plan value; `Subscription`/`Purchase` still keyed by `userId` — 2.1 re-owns them; suspended-tenant owners currently get 404 on billing — 2.7/2.9 give owners a billing path during grace and suspension.
