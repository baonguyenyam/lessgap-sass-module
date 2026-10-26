# 0001. Fork the kit and keep it mergeable with upstream

**Status:** superseded by [0011](./0011-independent-project-kit-as-reference.md)
**Date:** 2026-10-26

## Context
The repository is OpenStarterKit 2.4 (MIT), which ships continuously: auth,
billing, security fixes. Its rules (`AGENTS.md`) assume a neutral kit. We are
building one specific product on it.

## Decision
Treat this repository as a fork with the kit as `upstream`. Add platform code
in new directories (`src/platform/`, `src/modules/`, `src/themes/`,
`src/verticals/`, `spec/`) and change kit files only where the platform must
hook in (proxy, auth config, schema, dashboard layout, billing ownership).
Merge upstream at least once a month and on every kit security release.

The kit rule "the kit is neutral" keeps applying in this sense: our own brand
comes from environment variables and `src/config/`, and tenant content comes
from the database. No string about us or about a tenant is written into a
component.

## Consequences
- Security fixes in auth and billing arrive by merge.
- Every change to a kit file is a future merge conflict, so it must be small
  and commented with why the platform needs it.
- Kit guides in `docs/` (two languages) stay the kit's; platform design lives in `spec/`.

## Options considered
- **Copy the kit once and diverge freely:** simplest now, loses every future kit fix.
- **Start from platform.madelab.io:** more features, but built for print shops,
  Auth.js and Prettier-formatted code; adapting it costs more than adding tenancy here.
