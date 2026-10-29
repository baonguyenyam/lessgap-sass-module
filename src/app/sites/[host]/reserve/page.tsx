import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import { ReserveForm } from "@/components/reservations/reserve-form"

/** The site reserve page (task 5.8): party size → slot → details. */
export default async function ReservePage() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()
  const c = systemContext(resolved.tenantId, "customer")
  await requireModule(c, "reservations")
  const t = await getTranslations("site.reserve")
  const [rules, tables, existing] = await Promise.all([
    db8.orm.public.ReservationRule.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.Table.where({ tenantId: resolved.tenantId }).all(),
    db8.orm.public.Reservation.where({ tenantId: resolved.tenantId }).all(),
  ])
  const now = new Date()
  const range = { startTs: now.toISOString(), endTs: new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString() }
  const maxParty = Math.max(...rules.map((r) => r.maxPartySize), 1)
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ReserveForm
        tables={tables.map((x) => ({ id: x.id, name: x.name, capacity: x.capacity, area: x.area }))}
        rules={rules.map((r) => ({
          weekday: r.weekday,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          slotMinutes: r.slotMinutes,
          turnMinutes: r.turnMinutes,
          minPartySize: r.minPartySize,
          maxPartySize: r.maxPartySize,
        }))}
        existing={existing.map((r) => ({ tableId: r.tableId, startTs: r.startTs, endTs: r.endTs, status: r.status }))}
        maxParty={maxParty}
        range={range}
      />
    </div>
  )
}
