# 0003. Tenants are Better Auth organizations

**Status:** accepted
**Date:** 2026-10-26

## Context
The kit uses Better Auth with the Prisma adapter, magic link and two-factor.
Better Auth has an organization plugin with members, roles, invitations and
an active organization on the session.

## Decision
Enable the organization plugin, map its organization model to `Tenant` and
add our columns. Tenant roles are the plugin's roles restricted to `owner`,
`manager`, `staff`. Platform roles are a separate `platformRole` column on
`User`, not an organization role. The URL slug (`/t/[slug]`) decides which
tenant a dashboard request is for; the plugin's active organization is only a
default for where to land after sign-in.

Code reads membership through `src/platform/tenancy/`, never from the plugin
directly, in the same spirit as the kit's `@/lib/auth` rule.

## Consequences
- Invitations, member management and role checks come from a maintained library.
- We depend on the plugin's schema; upgrades need the same care as the kit's 2.0 migration.

## Options considered
- **Own tenant and membership tables:** full control, but invitations, role
  changes and session handling would be ours to build and secure.
- **Auth.js like platform.madelab.io:** the kit already moved off it.
