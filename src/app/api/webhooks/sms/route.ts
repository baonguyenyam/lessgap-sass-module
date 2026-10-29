import { NextResponse } from "next/server"
import { db8 } from "@/lib/db8"
import { smsStop } from "@/platform/notify/sms"
import { systemContext } from "@/platform/tenancy/context"

/** The SMS webhook stub (task 5.7): a provider posts delivery status and
 * replies. `STOP`/`STOPALL`/`UNSUBSCRIBE` clears consent across every
 * tenant — a customer texting STOP wins over any feature gate. Records the
 * status on the matching `NotificationLog` when the message ids line up. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    to?: string
    from?: string
    body?: string
    providerId?: string
    status?: string
  } | null
  if (!body?.from) return NextResponse.json({ error: "bad_request" }, { status: 400 })
  const text = (body.body ?? "").trim().toUpperCase()
  if (text === "STOP" || text === "STOPALL" || text === "UNSUBSCRIBE") {
    const customers = await db8.orm.public.Customer.where({ phone: body.from }).all()
    for (const c of customers) {
      await smsStop(systemContext(c.tenantId, "sms.webhook"), body.from)
    }
    return NextResponse.json({ ok: true, stopped: customers.length })
  }
  if (body.providerId && body.status) {
    await db8.orm.public.NotificationLog.where({ providerId: body.providerId }).update({ status: body.status })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: true })
}
