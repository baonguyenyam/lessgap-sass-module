import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppointmentActions } from "@/components/booking/appointment-actions"

/** Dashboard → Calendar (task 5.3): the tenant's appointments grouped by
 * day — a member sees the whole team's book, a staff member filters to
 * their own column via `?staff=`. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ staff?: string }> }) {
  const c = await requireTenantContext("bookings", "view")
  await requireModule(
    { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } },
    "booking"
  )
  const t = await getTranslations("dashboard.calendar")
  const { staff: staffFilter } = await searchParams
  const [appointments, staff] = await Promise.all([
    db8.orm.public.Appointment.where({ tenantId: c.tenantId })
      .include("customer")
      .include("service")
      .include("staff")
      .orderBy((a) => a.startTs.asc())
      .all(),
    db8.orm.public.StaffMember.where({ tenantId: c.tenantId }).all(),
  ])
  const filtered = staffFilter ? appointments.filter((a) => a.staffId === staffFilter) : appointments
  const byDay = new Map<string, typeof filtered>()
  for (const a of filtered) {
    const day = toDate(a.startTs).toISOString().slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), a])
  }
  const fmt = (ts: string) => toDate(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <AppointmentActions staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
      {byDay.size === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {list.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {fmt(a.startTs)}–{fmt(a.endTs)} · {a.customer?.name ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.staff?.name ?? "—"} · {a.service?.name ?? "—"} · {a.status}
                    </p>
                  </div>
                  <AppointmentActions appointmentId={a.id} status={a.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
