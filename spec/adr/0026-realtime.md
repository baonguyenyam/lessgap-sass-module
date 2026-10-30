# 0026. Realtime pushes come from Pusher Channels

**Status:** accepted (implemented — see phase briefs 13–15)
**Date:** 2026-10-29

## Context

The dashboard's calendar wants to live-update when a customer books
(spec/10's "server push" row). SSE needs a persistent connection Vercel's
serverless can't hold; WebSockets need a managed provider. Pusher Channels
and Ably both fit; the kit's own auth (`Better Auth`) can issue the
channel-auth signature the client needs.

## Decision

Pusher Channels — the client subscribes to `tenant-<id>-booking` for the
calendar's live updates; the server publishes from `bookAppointment` /
`manageAppointment` when a row lands. Env: `PUSHER_APP_ID`, `PUSHER_KEY`,
`PUSHER_SECRET`, `PUSHER_CLUSTER`.

## Consequences

A managed dependency for the realtime path; Ably is the alternative (same
price band — Pusher's Next.js examples are more complete). The channel-auth
endpoint needs its own `/api/pusher/auth` route — signature issued against
the session.
