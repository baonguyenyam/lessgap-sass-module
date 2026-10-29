"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import PusherJS from "pusher-js"
import { bookingChannel } from "@/platform/realtime/pusher"

/** The calendar's live updates (task 13.2): subscribe to
 * `private-tenant-<id>-booking` and refresh on `booking.changed`. The
 * component is a no-op without `NEXT_PUBLIC_PUSHER_KEY` — realtime simply
 * isn't on, the calendar renders the same. */
export function BookingLiveUpdates({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!key || !cluster) return
    const client = new PusherJS(key, {
      cluster,
      channelAuthorization: { transport: "ajax", endpoint: "/api/pusher/auth" },
    })
    const channel = client.subscribe(bookingChannel(tenantId))
    channel.bind("booking.changed", () => router.refresh())
    return () => {
      channel.unbind_all()
      client.unsubscribe(bookingChannel(tenantId))
      client.disconnect()
    }
  }, [tenantId, router])
  return null
}
