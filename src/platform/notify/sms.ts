import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { audit } from "@/platform/audit"
import type { TenantContext } from "@/platform/tenancy/context"

/** The SMS provider (task 5.7, decision 5-B — like `DomainProvider`): a
 * tenant's SMS goes through this interface. `local` logs to
 * `NotificationLog`; `twilio` ships behind `TWILIO_*` env later — the
 * consent + STOP rules live here regardless. */
export interface SmsProvider {
  name: string
  send(ctx: TenantContext, to: string, body: string): Promise<{ providerId: string | null; ok: boolean }>
}

const localProvider: SmsProvider = {
  name: "local",
  send: async (ctx, to, body) => {
    await db8.orm.public.NotificationLog.create({
      tenantId: ctx.tenantId,
      channel: "sms",
      template: "sms.local",
      recipient: to,
      status: "sent",
      sentAt: nowTs(),
      payload: { body },
    })
    return { providerId: null, ok: true }
  },
}

export function getSmsProvider(): SmsProvider {
  // Twilio lands behind TWILIO_SID/TWILIO_TOKEN/TWILIO_FROM — the interface
  // is the seam; `local` is the dev/test default.
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) {
    return {
      name: "twilio",
      send: async () => ({ providerId: null, ok: false }),
    }
  }
  return localProvider
}

/** STOP handling (spec/10): the keyword clears the customer's SMS consent
 * across the tenant and audits — the provider webhook calls it. */
export async function smsStop(ctx: TenantContext, phone: string): Promise<void> {
  const rows = await db8.orm.public.Customer.where({ tenantId: ctx.tenantId, phone }).all()
  for (const row of rows) {
    await db8.orm.public.Customer.where({ id: row.id }).update({ smsConsentAt: null, smsConsentSource: null })
  }
  await audit(ctx, {
    action: "notify.sms_stop",
    data: { phone, customers: rows.length },
  })
}
