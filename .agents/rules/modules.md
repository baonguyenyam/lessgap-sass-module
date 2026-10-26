# Modules, entitlements and themes

Applies to `src/modules/`, `src/platform/entitlements/`, `src/themes/`, `src/verticals/`.
Design: `spec/01-architecture.md`, `spec/04-entitlements.md`, `spec/06-sites-themes-verticals.md`, `spec/07-modules.md`.

## Before adding anything

1. Read the spec section for the module and the current phase in `spec/roadmap.md`.
   Build only what that phase lists. Anything else goes under "Later" in the roadmap.
2. Search the repository for the behaviour, not just the name. If something
   already does it, extend it. The second copy of an idea is refactored into
   one; there is never a third.
3. Use the words in `spec/glossary.md`. A new term needs a glossary entry first.

## Module shape

Every module has the same folders (`module.ts`, `schema.ts`, `lib/`, `server/`,
`actions.ts`, `components/`, `site/`, `jobs.ts`), as in
`spec/01-architecture.md`. Leave out what you do not need; never invent a new
top-level folder in a module.

- `lib/` is pure and tested. Prices, availability, fees, limits: functions.
- `server/` is `import "server-only"`; every export takes `TenantContext` first.
- `server/index.ts` is the module's only public surface for other modules.
  Never import another module's `components/`, `lib/` internals or Prisma models.
- `actions.ts` does, in order: `requireTenantMember(slug, permission)` →
  `requireFeature` / `consumeLimit` → Zod parse → service call → revalidate.
- Cross-module reactions use `emit(ctx, event, payload)` and subscribers in
  `module.ts`, not direct calls into the listener.
- The module is listed in `src/modules/registry.ts`. Nothing else enumerates modules.

## Entitlements

- Declare features in the owning module's `module.ts` with `defineFeatures`.
  A feature key that is not declared does not exist.
- Check with `getEntitlements`, `requireFeature`, `consumeLimit` only. No
  reading `plan.slug`, `plan.features` or `subscription.status` to decide access.
- The server check is the check. Hiding UI is presentation.
- Turning a feature off hides and blocks; it never deletes data.

## Themes

- Themes render `SiteData`. They never import Prisma, services, the session
  or `next/headers`.
- Interactive parts come from `src/modules/<module>/site/`. A theme styles them
  through tokens and slots and never re-implements booking, cart, quote or chat.
- No tenant content in theme code: names, phone numbers, prices, copy come from data.
- Theme styling uses the theme's tokens (CSS custom properties) and is scoped
  to the site root; it never touches dashboard styles.
- A theme ships fixtures and passes the accessibility E2E on its fixture site.

## Verticals

- A vertical is a typed preset applied once at onboarding. Runtime code reads
  the tenant's settings, never the vertical definition (except to show labels in onboarding).

---

Based on: the spec in `spec/`, the modular-monolith pattern, and the "audit before code, one implementation per capability" rules of platform.madelab.io.
