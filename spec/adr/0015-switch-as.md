# 0015. Switch As: ROOT opens a session as another account

**Status:** proposed
**Date:** 2026-10-26

## Context
The product owner asked for a way to switch between kinds of member quickly
while developing and testing, after looking at how other products do it
(Better Auth's admin impersonation, Laravel Impersonate, django-hijack, the
"view as" of hosted auth providers). ROOT (ADR 0014) is the only account
with authority over the whole system. Phase 1 plans staff impersonation of
tenants with a reason, a banner, audit rows and a 60-minute expiry
(spec/02-tenancy.md).

## Decision
- **Switch As** is a ROOT-only action: a "Switch as" button on each user row
  of the admin panel opens a new session as that user. The rule is
  `canSwitchAs` in `src/lib/roles.ts`: ROOT only, never onto ROOT, never
  onto yourself, never from a session that is already switched.
- Mechanism: a small Better Auth plugin, `switchAs` in `src/auth.ts`, which
  does what the admin plugin's `impersonate-user` does. The new session has
  `Session.switchedBy` = the ROOT user id and lasts at most one hour; the ROOT
  session token is kept in a signed `switch_as_session` cookie. "Switch back"
  deletes the switched session and restores the ROOT one; if the ROOT session
  is gone, the browser ends signed out, never stuck in the other account.
- Server actions (`src/app/actions/switch-as.ts`) check the rule before
  calling the endpoints, and the endpoints check it again.
- A banner with "Switch back" is on every signed-in layout while the session
  is switched (`SwitchAsBanner`, reading `getSwitchedBy()` from `@/lib/auth`).
- It works in every environment, because it is gated by role, not by
  `NODE_ENV`. The dev and demo one-click sign-ins stay as they are.

## Consequences
- ROOT sees exactly what a user or an admin sees, against real data. Every
  change made while switched is real; the banner says so.
- No audit row yet: `AuditLog` arrives in phase 1, whose brief records that
  Switch As must write rows on start and stop. Until then the `Session` row
  carries `switchedBy` while it lives.
- The target's second factor is not asked: the switch is authorised by the
  ROOT session, which passed its own.

## Options considered
- **Better Auth's `admin` plugin:** the same impersonation, but it also adds
  ban columns, its own lowercase role defaults and a `set-role` endpoint
  that would let a role, ROOT included, be granted through the API, which
  ADR 0014 forbids. Disabling those piece by piece is more code than the
  hundred lines of the plugin we wrote.
- **A dev-only persona menu** (sign in as seeded USER/ADMIN accounts with
  one click): only useful locally and needs fixture accounts per role; Switch
  As covers it with real accounts and also helps support in production.
