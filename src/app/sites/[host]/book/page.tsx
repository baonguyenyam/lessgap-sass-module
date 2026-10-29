import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { resolveHost } from "@/platform/tenancy/host"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import { availableSlots } from "@/lib/availability"
import { BookingForm } from "@/components/booking/booking-form"

/** The site booking page (task 5.4): a visitor picks a service, staff (or
 * "any") and a slot from `availableSlots`, then their details. The form
 * posts to `bookAppointment`; the slot re-checks server-side. */
export default async function BookPage() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()
  const c = systemContext(resolved.tenantId, "customer")
  await requireModule(c, "booking")
  const t = await getTranslations("site.booking")
  const [services, staff, rules, timeOff, existing, tenant] = await Promise.all([
    db8.orm.public.Service.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.StaffMember.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.AvailabilityRule.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.TimeOff.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.Appointment.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.Tenant.where({ id: resolved.tenantId }).first(),
  ])
  const dental = tenant?.verticalKey === "dental"
  const now = new Date()
  const range = { startTs: now.toISOString(), endTs: new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString() }
  const slots = availableSlots(
    rules.map((r) => ({
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      staffId: r.staffId,
      resourceId: r.resourceId,
    })),
    timeOff.map((t) => ({ staffId: t.staffId, resourceId: t.resourceId, startTs: t.startTs, endTs: t.endTs })),
    existing.map((a) => ({
      staffId: a.staffId,
      resourceId: a.resourceId,
      startTs: a.startTs,
      endTs: a.endTs,
      status: a.status,
    })),
    { durationMinutes: 30 },
    "any",
    range,
    "UTC",
    { stepMinutes: 30, minNoticeMinutes: 60 }
  )
  const slotList = slots.slice(0, 60).map((s) => ({ ...s, label: `${toDate(s.startTs).toUTCString()}` }))

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {dental && <p className="text-sm text-muted-foreground">{t("no_phi")}</p>}
      <BookingForm
        services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes }))}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        slots={slotList}
      />
    </div>
  )
}
