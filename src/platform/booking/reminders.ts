import { db8 } from "@/lib/db8"
import { nowTs, toDate } from "@/lib/timestamps"
import { getEntitlements } from "@/platform/entitlements"
import { getSmsProvider } from "@/platform/notify/sms"
import { notify } from "@/platform/notify"
import { dueForReminder } from "@/lib/booking/reminders"
import { signManageToken } from "@/lib/booking/manage-token"
import { siteOrigin } from "@/platform/tenancy/site-origin"
import { systemContext } from "@/platform/tenancy/context"
import type { SmsProvider } from "@/platform/notify/sms"

/** The reminder job (task 5.7, spec/07): every confirmed appointment inside
 * a tenant's reminder windows (default 24 h and 2 h) and not yet reminded
 * for that window gets `booking.reminder` — email always, SMS only when
 * `booking.sms_reminders` is entitled AND the customer consented. The send
 * stamps `remindedAt`, so a rerun is a no-op for that window. */
const DEFAULT_WINDOWS = [1440, 120]

async function windowsFor(tenantId: string): Promise<number[]> {
  const row = await db8.orm.public.TenantSetting.where({ tenantId, key: "booking.reminder_minutes" }).first()
  const value = row?.value
  return Array.isArray(value) && value.every((n) => typeof n === "number") ? (value as number[]) : DEFAULT_WINDOWS
}

export async function sendReminders(now: Date = new Date(), sms: SmsProvider = getSmsProvider()): Promise<number> {
  const due = await db8.orm.public.Appointment.where({ status: "confirmed" }).all()
  let sent = 0
  for (const appt of due) {
    const windows = await windowsFor(appt.tenantId)
    const window = dueForReminder(appt.startTs, appt.remindedAt, windows, now)
    if (window === null) continue
    const ctx = systemContext(appt.tenantId, "platform.booking.remind")
    const [customer, service, staff, tenant] = await Promise.all([
      db8.orm.public.Customer.where({ id: appt.customerId }).first(),
      appt.serviceId ? db8.orm.public.Service.where({ id: appt.serviceId }).first() : null,
      db8.orm.public.StaffMember.where({ id: appt.staffId }).first(),
      db8.orm.public.Tenant.where({ id: appt.tenantId }).first(),
    ])
    if (!customer) continue
    const time = toDate(appt.startTs).toUTCString()
    const manageUrl = `${siteOrigin(tenant?.slug ?? "", null)}/sites/${tenant?.slug}/book/manage/${signManageToken(appt.id)}`
    if (customer.email) {
      await notify(ctx, "booking.reminder", customer.email, {
        name: customer.name,
        service: service?.name ?? "appointment",
        staff: staff?.name ?? "",
        time,
        manageUrl,
      })
    }
    const smsOk =
      (await getEntitlements(ctx)).has("booking.sms_reminders") && customer.smsConsentAt !== null && customer.phone
    if (smsOk && customer.phone) {
      await sms.send(ctx, customer.phone, `Reminder: ${service?.name ?? "your appointment"} at ${time}.`)
    }
    await db8.orm.public.Appointment.where({ id: appt.id }).update({ remindedAt: nowTs() })
    sent++
  }
  return sent
}
