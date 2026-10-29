import Pusher from "pusher"

/**
 * Pusher Channels (task 13.2, ADR 0026): `tenant-<id>-booking` publishes
 * `booking.changed` whenever `bookAppointment`/`manageAppointment` lands a
 * row; the calendar's `BookingLiveUpdates` subscribes and refreshes. The
 * helper is env-gated — no `PUSHER_*` means realtime simply isn't on, the
 * writes work the same.
 */

function configured() {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER
  )
}

let _pusher: Pusher | null = null
export function pusher(): Pusher | null {
  if (!configured()) return null
  if (!_pusher) {
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  }
  return _pusher
}

/** The public channel a tenant's calendar subscribes to. */
export function bookingChannel(tenantId: string) {
  return `private-tenant-${tenantId}-booking`
}

export async function publishBookingChange(tenantId: string, payload: { appointmentId: string; status: string }) {
  const p = pusher()
  if (!p) return
  await p.trigger(bookingChannel(tenantId), "booking.changed", payload).catch(() => {
    // Realtime is best-effort — a failed publish never fails the write.
  })
}
