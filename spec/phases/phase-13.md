# Phase 13 — status page, realtime, locations

The "Later" items that were blocked on a decision now have proposed ADRs —
the proposals' implementations are this phase (the ADR is the decision doc;
the code lands it).

**Read:** `spec/adr/0029-status-page.md`, `spec/adr/0026-realtime.md`,
`spec/adr/0025-multiple-locations.md`, spec/10-ops-and-observability.md.

## Scope

- Phase 13: in progress.

## Tasks

### 13.1 `/status` — a first-party status page (ADR 0029)

A `HealthCheck` row the `platform.health_check` job writes; `/status` on
the primary domain renders the latest probe — the tenant's customers see
"is the platform up" without a managed provider.

**Tests:** integration — the job writes a `HealthCheck` row; `/status`
renders the last one.
**Done when:** the page reads what the job writes.
- [x] done (`tests/integration/status-probe.test.ts` 1/1 — `platform.health_check` runs `probeHealth` (DB `SELECT 1` latency + a `RUNNING` job's stale `lockedUntil`) → `HealthCheck` rows; `/status` reads the latest per kind.)

### 13.2 Pusher realtime (ADR 0026)

`tenant-<id>-booking` publishes on `bookAppointment`/`manageAppointment`;
the calendar subscribes. `/api/pusher/auth` signs the channel-auth.

**Tests:** integration — a publish call fires on book/cancel (mock Pusher).
**Done when:** the publishes + auth route exist.
- [x] done (`tests/integration/realtime.test.ts` 2/2 — `publishBookingChange` triggers `private-tenant-<id>-booking`'s `booking.changed` when `PUSHER_*` is set and is a no-op without; `bookAppointment`/`manageAppointment` fire it; `/api/pusher/auth` signs the channel for the member's tenant; `BookingLiveUpdates` refreshes the calendar.)

### 13.3 `Location` — a tenant's second branch (ADR 0025)

`Location` tenant-owned; `StaffMember`/`Appointment`/`AvailabilityRule`/
`TimeOff`/`Order` gain `locationId` nullable.

**Tests:** integration — a second-location staff books without clashing.
**Done when:** the schema + the locationId path work.
- [ ] done

## Exit criteria

- The status page renders, the realtime publishes fire, the location path books.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:integration` green.

## Findings
