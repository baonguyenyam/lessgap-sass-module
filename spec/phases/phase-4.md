# Phase 4 — Catalog, team, verticals, onboarding

**Status:** draft
**Roadmap:** [roadmap.md#phase-4--catalog-team-verticals-onboarding](../roadmap.md)
**Read first:** [modules.md](../07-modules.md) (`catalog`, `team`), [sites-themes-verticals.md](../06-sites-themes-verticals.md#verticals), [module-system.md](../15-module-system.md).

## Goal

A tenant's site shows real content: `catalog` (service categories, services
with duration and price, variants) and `team` (staff profiles) are the
second and third modules through the lifecycle the newsletter proved in
phase 2 — tenant-owned, purgable, gated by `module.catalog` /
`module.team` switches. Vertical presets (`nail_salon`, `barber`,
`restaurant`, `dental`, `generic`) seed sample data marked `isSample` and
removable; an onboarding wizard (self-service and staff-created) walks a
new tenant to a live site; a second shared theme proves the theme contract
holds for two designs.

## Out of scope

- Booking/reservations, customers, notifications — phase 5.
- `shop` module — phase 6.
- Visual page-builder — later phase; `Page` content stays theme-keyed.

## Decisions needed before starting
| # | Question | Options | Decision |
|---|---|---|---|
| 4-A | `StaffMember` vs tenant `Member` | Separate table / same table | **Separate `StaffMember`** — spec/07: staff may exist without a login and is separate from tenant membership and roles |
| 4-B | Vertical application surface | Wizard step / dashboard re-apply | **Wizard only** — spec/06: applying a vertical writes ordinary rows once; it is not re-consulted at runtime |
| 4-C | Second theme direction | Restyle `main` / new design | **New shared theme `classic`** — proves the contract with an independent design, `verticals: ["generic", "restaurant"]` |

## Tasks

### 4.1 — Catalog + team schema
- **Goal:** `ServiceCategory`, `Service`, `ServiceVariant`, `StaffMember`
  models — tenant-owned, `@@rls`, cascade; `isSample` flags where spec
  requires (Service, StaffMember).
- **Files:** `prisma/contract.prisma`, `migrations/app/<ts>_platform_catalog_team`,
  `src/platform/tenancy/models.ts`, `src/platform/tenancy/delete-tenant.ts`.
- **Tests:** T9 covers the new models.
- **Checks:** `pnpm db:emit`, `pnpm db:plan`, `pnpm db:migrate`, `pnpm audit:tenancy`.
- **Done when:** models exist tenant-owned, deletion verified.
- [x] done (`platform_catalog_team` adds `ServiceCategory`, `Service` (categoryId, durationMinutes, priceCents, currency, imageKey, `isSample`, status), `ServiceVariant` (own duration/price), `StaffMember` (name, photo, bio, `isSample` — not a Member) and `StaffService` join — all tenant-owned, `@@rls`, cascade. `MODEL_CLASSIFICATION` 38 models; `deleteTenant` covers all five (T9).)

### 4.2 — `catalog` module through the lifecycle
- **Goal:** `src/modules/catalog/module.ts` manifest + hooks
  (`onEnable`/`onDisable`/`describeData`/`onExport`/`onPurge`), dashboard CRUD
  for categories/services, site section in `main` theme, `catalog.services.max`
  gate via `consumeLimit`/`requireFeature`.
- **Files:** `src/modules/catalog/*`, `/t/<slug>/catalog/*`, site section,
  nav, translations, `module.catalog` seed.
- **Tests:** lifecycle L-tests on catalog; unit — service limits; integration —
  CRUD + purge is tenant-scoped.
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** catalog enables, lists services on the site, purges cleanly.
- [x] done (`src/modules/catalog/module.ts` manifest (`ServiceCategory`/`Service`/`ServiceVariant`) + lifecycle (`describeData`/`onExport` one file per model/`onPurge` variants→services→categories). `/t/<slug>/catalog` lists categories and services; `addService` enforces `catalog.services.max` (`feature_unavailable`). The `main` theme's `services` section renders `SiteData.catalog` when `module.catalog` is on for the tenant; fixtures carry sample services. Registry regenerated; integration `catalog.test.ts` — purge is tenant-scoped, export returns one file per model.)

### 4.3 — `team` module through the lifecycle
- **Goal:** `src/modules/team/module.ts` manifest + hooks; Teams page manages
  `StaffMember` records (display name, photo, bio, services); site team
  section.
- **Files:** `src/modules/team/*`, `/t/<slug>/team/*`, site section, nav,
  translations, `module.team` seed.
- **Tests:** lifecycle L-tests; integration — staff may exist without a login
  (no Member/User row needed).
- **Checks:** `pnpm test`, `pnpm test:integration`, `pnpm modules:check`.
- **Done when:** staff list on the dashboard, show on the site, purge works.
- [x] done (`src/modules/team/module.ts` manifest (`StaffMember`, `StaffService`) + lifecycle; `/t/<slug>/team` manages staff — a `StaffMember` is not a `Member`/`User`, it may never have a login (integration-tested). `team` is a `TenantResource` (`view`/`manage`) in the `workspace` group; managers hold `team.*`. The `main` theme's `team` section renders `SiteData.team` when `module.team` is on; fixtures carry sample staff. Registry regenerated — three modules.)

### 4.4 — Vertical presets + sample data
- **Goal:** `src/verticals/<key>.ts` typed objects for `nail_salon`,
  `barber`, `restaurant`, `dental`, `generic` — terminology, suggested
  modules, seed data (categories, services `isSample`, staff `isSample`,
  themeKey); `applyVertical(tenant, key)` writes rows once; a "remove sample
  data" dashboard action deletes `isSample` rows.
- **Files:** `src/verticals/*`, `src/platform/verticals/apply.ts`, dashboard
  remove-samples action, translations.
- **Tests:** unit — apply writes expected rows + `isSample`; integration —
  remove-samples deletes only marked rows.
- **Checks:** `pnpm test`, `pnpm test:integration`.
- **Done when:** applying `nail_salon` gives a tenant sample services it can
  remove in one click.
- [ ] done

### 4.5 — Onboarding wizard
- **Goal:** `/onboarding` — business name, vertical, slug (live preview),
  basics (address/phone/hours/logo), theme choice, finish → `ensureTenant` +
  `applyVertical` + `Site` created + checklist; staff-created path from
  `/platform/tenants` reuses it.
- **Files:** `src/app/onboarding/*`, actions, checklist card on tenant home,
  translations.
- **Tests:** integration — wizard writes tenant + site + sample rows; E2E —
  signup → wizard → site live.
- **Checks:** `pnpm test`, `pnpm test:integration`, E2E.
- **Done when:** the signup→wizard→site exit path is green.
- [ ] done

### 4.6 — Second shared theme `classic`
- **Goal:** a second `kind: "shared"` theme with its own layout/tokens that
  renders the same `SiteData` + fixtures as `main` — no theme-specific data
  code.
- **Files:** `src/themes/classic/*`, `src/themes/registry.ts`, fixtures.
- **Tests:** contract — both themes render `fixtureSite`; unit — theme
  selection by `themeKey`.
- **Checks:** `pnpm test`, `pnpm modules:check`.
- **Done when:** the same fixture site renders through both themes.
- [ ] done

## Exit criteria

- E2E: signup → wizard → site live with the vertical's sample services.
- Both shared themes render the same `SiteData` fixture with no
  theme-specific data code.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm modules:check`, `pnpm audit:tenancy` all green.

## Findings

- Decision 4-A (spec/07): `StaffMember` is its own tenant-owned table —
  separate from `Member`, may exist without a login.
