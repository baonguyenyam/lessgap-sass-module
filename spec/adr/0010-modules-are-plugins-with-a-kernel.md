# 0010. Modules are plugins on a kernel

**Status:** proposed
**Date:** 2026-10-26

## Context
We will run many capabilities (booking, shop, quotes, chatbot, more later)
that must be switchable per platform, per plan and per tenant, and we want to
try new ones on a few tenants first. Code is written mostly by agents across
many sessions; without hard boundaries, capabilities leak into each other and
the codebase loses its shape.

## Decision
A modular monolith: one deployment, one database, with every capability as a
module that declares a manifest (features, permissions, settings, models,
routes, site blocks, events, jobs, extension points, lifecycle hooks,
dependencies, stage). A small kernel in `src/platform/` loads modules from a
generated registry and decides whether a module is active for a tenant.
Boundaries are enforced by lint rules and contract tests; new modules are
created only by a scaffolding command.

## Consequences
- Turning a module off, rolling it out to a few tenants or deprecating it are
  configuration, not code changes.
- Every module has the same shape, which agents can learn once.
- Some up-front cost in phase 0–1 (kernel, registry, lint rules, scaffolder).
- Prisma has one migration history; module ownership is by schema file and
  migration naming, not separate migration folders.

## Options considered
- **Feature folders without a manifest:** cheaper now; on/off and dependencies
  end up as `if` statements spread through the code.
- **Separate packages in a monorepo (pnpm workspaces):** stronger isolation,
  but heavier builds and Next.js routing across packages; revisit if a module
  ever needs to ship separately.
- **Runtime plugins loaded from a marketplace:** not needed; we write all modules ourselves.
