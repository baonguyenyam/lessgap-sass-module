import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { connection } from "next/server"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { verifyManageToken } from "@/lib/booking/manage-token"
import { resolveHost } from "@/platform/tenancy/host"
import { availableSlots } from "@/lib/availability"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ManageForm } from "@/components/booking/manage-form"

/** The manage-booking link (task 5.4): a customer's signed token opens a
 * page to reschedule or cancel their own appointment. */
export default async function ManagePage({ params }: { params: Promise<{ host: string; token: string }> }) {
  await connection()
  const { host, token } = await params
  const verified = verifyManageToken(token)
  if (!verified) notFound()
  const resolved = await resolveHost((await headers()).get("host") ?? host)
  if (resolved.kind !== "site") notFound()
  const t = await getTranslations("site.booking")
  const appointment = await db8.orm.public.Appointment.where({
    tenantId: resolved.tenantId,
    id: verified.appointmentId,
  })
    .include("staff")
    .include("service")
    .first()
  if (!appointment) notFound()
  const [rules, timeOff, existing] = await Promise.all([
    db8.orm.public.AvailabilityRule.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.TimeOff.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.Appointment.where({ tenantId: resolved.tenantId }).all(),
  ])
  const now = new Date()
  const slots = availableSlots(
    rules.map((r) => ({
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      staffId: r.staffId,
      resourceId: r.resourceId,
    })),
    timeOff.map((x) => ({ staffId: x.staffId, resourceId: x.resourceId, startTs: x.startTs, endTs: x.endTs })),
    existing
      .filter((a) => a.id !== appointment.id)
      .map((a) => ({
        staffId: a.staffId,
        resourceId: a.resourceId,
        startTs: a.startTs,
        endTs: a.endTs,
        status: a.status,
      })),
    { durationMinutes: appointment.service?.durationMinutes ?? 60 },
    appointment.staffId,
    { startTs: now.toISOString(), endTs: new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString() },
    "UTC",
    { stepMinutes: 30, minNoticeMinutes: 60 }
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold">{t("manage_title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{appointment.service?.name ?? t("appointment")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{toDate(appointment.startTs).toUTCString()}</p>
          <p className="text-muted-foreground">
            {appointment.staff?.name ?? "—"} · {t(`status.${appointment.status}`)}
          </p>
        </CardContent>
      </Card>
      <ManageForm
        token={token}
        status={appointment.status}
        slots={slots.slice(0, 60).map((s) => ({ ...s, label: `${toDate(s.startTs).toUTCString()}` }))}
      />
    </div>
  )
}
