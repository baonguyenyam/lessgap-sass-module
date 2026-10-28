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
- [ ] done

### 2.2 — Feature registry and the five-layer resolver
- **Goal:** `defineFeatures` + `src/platform/entitlements/registry.ts` collects every declared key; `getEntitlements(ctx)` resolves switch → plan → add-ons → override → tenant setting with `requires` chains, `ignoresSwitch` escapes and unexpired-override-only semantics; `ent.has` / `ent.limit` replace the phase-1 stand-in (layer-1 only).
- **Files:** `src/platform/entitlements/` (registry, resolver), the features declared by existing surfaces (newsletter, members, roles) move into it.
- **Tests:** unit resolver for every layer combination — switch off wins unless `ignoresSwitch`; add-on beats plan default; expired override falls through; `requires` unmet turns a feature off; `0` vs `null` limits.
- **Checks:** `pnpm typecheck`, `pnpm test`.
- **Done when:** the resolver passes the full matrix and existing `getEntitlement` callers read the real layers.
- [ ] done

### 2.3 — `requireFeature` and `consumeLimit` with `UsageCounter`
- **Goal:** `requireFeature(ctx, key)` throws `FeatureNotAvailable` (404 on routes, typed error in actions); `consumeLimit(ctx, key, n)` increments the period bucket inside the guarded write's transaction with a conditional update; lowering a limit never deletes data.
- **Files:** `src/platform/entitlements/` additions, `UsageCounter` queries, error types in `src/platform/errors.ts`.
- **Tests:** unit for throws and `LimitReached`; integration: two concurrent `consumeLimit` calls never exceed the limit (roadmap exit criterion).
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** the concurrency test is green and no code path can take a unit outside the transaction.
- [ ] done

### 2.4 — Platform switches page
- **Goal:** the initial switch set exists (`signup.*`, `maintenance.*`, `feature.*`, `chatbot.provider`) and staff edit `PlatformSwitch` rows in `/platform/settings` or a switches page — with the cache invalidation spec/04 requires, and an audit row per change.
- **Files:** `src/app/(platform)/platform/settings/*` (or `switches/*`), `src/platform/settings/store.ts` seed/invalidation, `src/app/actions/platform-ops.ts` (or a new switches action file).
- **Tests:** unit — a switch write re-scopes through `requirePlatformRole` and audits; integration — the new value is visible to `getPlatformSettings` on the next read.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** flipping a switch in the console takes effect without a restart and leaves an audit row.
- [ ] done

### 2.5 — Platform plans page
- **Goal:** `/platform/plans` lists `Plan` rows with visibility; staff edit the feature map (validated against the registry), setup fee and visibility, and see how many tenants a change touches before saving (spec/04).
- **Files:** `/platform/plans/*`, plan actions, feature-map editor component, translations.
- **Tests:** unit — invalid feature keys and bad values refused; unlisted plan not assignable through public flows; integration — plan edit flips a tenant's resolved entitlement.
- **Checks:** `pnpm test`, `pnpm test:integration`, E2E smoke.
- **Done when:** an edited plan changes what its tenants resolve on their next read, and the save screen showed the affected count first.
- [ ] done

### 2.6 — Tenant overrides
- **Goal:** `/platform/tenants/[slug]` gains an overrides section: grant, revoke or change any feature for that tenant with a reason and optional expiry; every row is audited; expired rows stop applying without being deleted.
- **Files:** tenant detail additions, `src/app/actions/platform-tenants.ts` (or overrides file), resolver reads `EntitlementOverride` (already in 2.2).
- **Tests:** unit — reason required, expiry optional, `ignoresSwitch` honoured; integration — an override resolves then expires.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** an override visibly flips the tenant's `ent.has` for one feature and the audit log names staff, reason and expiry.
- [ ] done

### 2.7 — Tenant-owned billing: re-own, free plan, add-ons, setup fee
- **Goal:** checkout, portal, webhooks and the tenant billing page read the tenant's subscription (one per tenant); the free plan needs no Stripe subscription; add-ons sell via `AddOn`/`TenantAddOn` rows and fold into the resolver; a plan's `setupFeeCents` charges once at first checkout.
- **Files:** `src/app/(dashboard)/t/[slug]/billing/*`, `src/app/api/checkout`, `src/app/api/webhooks/stripe`, `src/lib/billing`, add-on actions.
- **Tests:** unit — free plan resolves features without a subscription row; add-on contributes its features; setup fee appears only on the first invoice. Integration — a webhook event maps to the tenant, not a user.
- **Checks:** `pnpm test`, `pnpm test:integration`; manual checkout on Stripe test mode.
- **Done when:** a tenant on the free plan gets its feature map, a paid tenant's add-on flips `ent.has`, and no billing read trusts a `userId` anymore.
- [ ] done

### 2.8 — Pricing and signup respect the switches
- **Goal:** the public pricing page lists only `PUBLIC` plans; `signup.free_plan.enabled` off removes the free plan from pricing and signup; `signup.enabled` off closes self-service signup; `signup.require_approval` leaves new tenants in `provisioning` for staff.
- **Files:** `src/app/[locale]/pricing`, signup flow, `src/platform/tenancy/ensure-tenant` (approval gate), nav/CTAs.
- **Tests:** E2E — switching `signup.free_plan.enabled` off removes the free plan from pricing and signup (roadmap exit criterion); `signup.enabled` off refuses a new signup.
- **Checks:** `pnpm test`, E2E on a fresh build.
- **Done when:** the switches visibly gate the public surface without a redeploy.
- [ ] done

### 2.9 — `past_due` grace period and suspension
- **Goal:** a subscription that goes `past_due` starts the plan's grace period (decision 2-D); when it lapses the tenant suspends the same way staff suspension does (`resolveTenantMember` → 404); recovering payment reactivates it. Owner sees a billing banner during grace.
- **Files:** webhook handler, `resolveTenantMember` (or a `suspendedAt`/`graceUntil` on Tenant — decide in the task), banner component, actions.
- **Tests:** integration — webhook `past_due` at T, tenant still works at T+grace-1, 404 at T+grace; recovery clears it.
- **Checks:** `pnpm test:integration`.
- **Done when:** the timeline is covered end-to-end without manual dates in the test.
- [ ] done

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
