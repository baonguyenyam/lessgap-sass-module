import { connection, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { pusher, bookingChannel } from "@/platform/realtime/pusher"
import { db8 } from "@/lib/db8"

/**
 * Pusher channel auth (task 13.2): a private channel needs a signature —
 * `socket_id` + `channel_name` come from pusher-js's own POST. The member's
 * tenant scopes which channel they may sign.
 */
export async function POST(req: Request) {
  await connection()
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const p = pusher()
  if (!p) return NextResponse.json({ error: "realtime_off" }, { status: 404 })

  const body = await req.formData()
  const socketId = body.get("socket_id") as string
  const channel = body.get("channel_name") as string
  const membership = await db8.orm.public.Member.where({ userId: user.id }).first()
  const tenantId = membership?.organizationId ?? null
  if (!tenantId || channel !== bookingChannel(tenantId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const auth = p.authenticate(socketId, channel)
  return NextResponse.json(auth)
}
