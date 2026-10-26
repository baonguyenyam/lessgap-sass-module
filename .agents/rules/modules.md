# Modules, entitlements and themes

Applies to `src/modules/`, `src/platform/`, `src/themes/`, `src/verticals/`.
Design: `spec/15-module-system.md` (read it before your first module task),
`spec/04-entitlements.md`, `spec/06-sites-themes-verticals.md`, `spec/07-modules.md`.

## Before adding anything

1. Read the module's section in `spec/07-modules.md` and the current phase
   brief in `spec/phases/`. Build only what the brief lists.
2. Search the repository for the behaviour, not just the name. If something
   already does it, extend it. The second copy of an idea is refactored into
   one; there is never a third.
3. Use the words in `spec/glossary.md`. A new term needs a glossary entry first.

## Creating and shaping a module

- Create a module only with `pnpm new:module <key>`. Never by hand, never by
  copying another module's folder.
- Every module has the standard shape (`module.ts`, `schema.ts`, `events.ts`,
  `lib/`, `server/`, `actions.ts`, `components/`, `site/`, `jobs.ts`). Leave out
  what you do not need; never invent a new top-level folder in a module.
- New modules start at `stage: "experimental"`. Promoting a stage is a
  separate, explicit change.
- The manifest (`module.ts`) declares everything the module contributes:
  features, permissions, settings schema, models, nav, site pages and blocks,
  events emitted and subscribed, jobs, extension points, lifecycle hooks,
  dependencies. If the kernel needs to know it, it is in the manifest. If it
  is not in the manifest, it does not exist.

## Boundaries

- Another module is reached only through `src/modules/<other>/server` (its
  public index) or its typed events. Never its `components/`, `lib/`,
  `actions.ts` or Prisma models. Lint enforces this; do not disable the rule.
- Declare a dependency in `dependsOn` before calling another module. No cycles.
- Reacting to something another module did is an event subscription, not a
  call added inside that module.
- A module never edits another module's Prisma file or adds relations to its models.
- `src/platform/` (the kernel) never imports a specific module.

## Layers inside a module

- `lib/` is pure and tested. Prices, availability, fees, limits: functions.
- `server/` is `import "server-only"`; every export takes `TenantContext` first.
- `actions.ts` does, in order: `requireTenantMember(slug, permission)` →
  `requireModule` → `requireFeature` / `consumeLimit` → Zod parse → service →
  revalidate.
- Dashboard routes of a module call `requireModule(ctx, key)` first.

## Switching off, safely

- Off means hidden and blocked: nav, routes (404), site blocks, jobs, subscribers.
- Off never deletes data. Only `onPurge`, run by tenant deletion or an explicit
  audited staff action, deletes a module's data.
- `onEnable` and every job and subscriber are idempotent.
- Enabling a module never creates tables. Tables come from the module's migration, shared by all tenants.
- A module with models implements `describeData`, `onExport` and `onPurge`
  (contract test L10). `onPurge` deletes only its own models' rows for that
  tenant, through `tenantDb`, in batches, idempotently, plus its files and
  embeddings. It is called only by the purge job or tenant deletion.
- Code that refers to another module's rows by id renders a missing row
  gracefully; that module's data can be purged.

## Entitlements

- Declare features in the owning module's `module.ts` with `defineFeatures`.
  A feature key that is not declared does not exist.
- Check with `isModuleActive`, `requireModule`, `getEntitlements`,
  `requireFeature`, `consumeLimit` only. Never read `plan.slug`,
  `plan.features` or `subscription.status` to decide access.
- The server check is the check. Hiding UI is presentation.

## Themes

- Themes render `SiteData`. They never import Prisma, services, the session
  or `next/headers`.
- Interactive parts are module site blocks (`<ModuleBlock name="..." />`). A
  theme styles them through tokens and slots and never re-implements booking,
  cart, quote or chat.
- No tenant content in theme code. Styling uses the theme's tokens, scoped to the site root.
- A theme ships fixtures and passes the accessibility E2E on its fixture site.

## Verticals

- A vertical is a typed preset applied once at onboarding. Runtime code reads
  the tenant's settings, never the vertical definition.

## Done for a module change

- [ ] Manifest validates; `pnpm modules:check` green.
- [ ] New models classified, RLS in the migration, isolation test (T1/T2 shape) for them.
- [ ] Gates checked server-side; a test proves the action refuses when the module or feature is off.
- [ ] Events typed and versioned; subscribers idempotent.
- [ ] Spec section for the module updated if behaviour differs from it.

---

Based on: `spec/15-module-system.md`, the modular-monolith pattern, and the "audit before code, one implementation per capability" rules of platform.madelab.io.
