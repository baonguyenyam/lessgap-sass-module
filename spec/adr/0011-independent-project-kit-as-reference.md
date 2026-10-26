# 0011. Independent project; the kit is a reference, not an upstream

**Status:** accepted
**Date:** 2026-10-26
**Supersedes:** [0001](./0001-fork-and-keep-upstream-mergeable.md)

## Context
ADR 0001 proposed keeping the repository mergeable with OpenStarterKit. The
decision from the product owner (Nguyên Phạm, 2026-10-26): lessgap-sass-module
is a new project from here on. The kit is something we learned from and may
borrow from, not something we merge.

## Decision
- No `upstream` remote, no scheduled merges. Fixes from the kit, if we want
  them, are ported by hand as ordinary changes.
- Kit code is our code: it may be changed, moved or removed when a phase
  brief calls for it, following the same rules as everything else.
- Platform code still goes into its own directories (`src/platform/`,
  `src/modules/`, `src/themes/`, `src/verticals/`) because that keeps the
  module boundaries clear, not for merge reasons.
- The kit's rule that no brand or tenant text is written into components still
  holds: our brand comes from `src/config/` and environment variables, tenant
  content from the database.
- The product's languages are English (default) and Vietnamese; the kit's
  Italian locale and Italian docs are replaced (phase 0, task 0.12).

## Consequences
- No merge conflicts to manage; no `Platform change` comments needed in kit files.
- Security fixes in the kit's dependencies arrive through our own dependency
  updates (Dependabot) and the `pnpm audit` step, not through kit releases.
- The MIT licence notice of the kit's code stays in `LICENSE` for the parts we keep.

## Options considered
- **ADR 0001 (mergeable fork):** rejected by the product owner.
