# 0029. The status page is a public page on the primary domain

**Status:** accepted (implemented — see phase briefs 13–15)
**Date:** 2026-10-29

## Context

The roadmap's "Later" list wants a status page — "is the platform up" for
the tenants' customers. A third-party provider (Statuspage, Better Uptime)
costs money and adds a brand the kit's deployers may not want; a
first-party page reads the platform's own health checks (`/healthz` +
the job queue's last-success timestamps) and renders on a public route.

## Decision

First-party — a `/status` route on the primary domain, rendering the last
`platform.health_check` job result + the site's up/down probe. The page is
static-cached (a few minutes) so an outage doesn't hide behind the
platform's own state.

## Consequences

The status data lives in a `HealthCheck` row the `platform.health_check`
job writes; the page reads the latest. A managed provider is the
alternative — rejected: an external service's outage and the platform's
outage are different things, and a first-party page is what tenants'
customers can reach.
