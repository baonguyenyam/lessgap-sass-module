# 0027. Passkeys wait for a Better Auth plugin

**Status:** proposed
**Date:** 2026-10-29

## Context

The dashboard's sign-in wants passkeys (spec/10's "passkey" row). The
installed Better Auth (1.7) does not ship a `passkey` plugin — the
community plugin space has `@better-auth/passkey` experiments but nothing
stable; a hand-rolled WebAuthn (`@simplewebauthn/server`) duplicates what
the plugin space will do better.

## Decision

Wait — passkeys land when Better Auth ships a stable plugin (watch
releases ≥ 1.8). The interim security posture stays on the two-factor
TOTP + the 2FA-gated `/platform` (task 10.2) — passkeys are a convenience,
not a coverage gap.

## Consequences

Nothing to build; the roadmap's "passkey" row stays open until the
library lands. An earlier draft proposed a custom WebAuthn route —
rejected: hand-rolled credential storage duplicates the plugin's model
and its bugs.
