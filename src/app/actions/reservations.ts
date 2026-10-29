"use server"

import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { reservationSlots } from "@/lib/booking/reservations"
import { resolveHost } from "@/platform/tenancy/host"
import { headers } from "next/headers"

/** The site reserve flow (task 5.8): a visitor picks a party size and a
 * slot; the slot re-checks through `reservationSlots` and the reservation
 * writes `confirmed`. */
export async function reserveTable(input: {
  tableId: string
  partySize: number
  startTs: string
  endTs: string
  name: string
  phone?: string
  email?: string
  notes?: string
}) {
  try {
    const host = (await headers()).get("host") ?? ""
    const resolved = await resolveHost(host)
    if (resolved.kind !== "site") throw new AppError("not_found")
    const c = systemContext(resolved.tenantId, "customer")
    await requireModule(c, "reservations")
    if (!input.name.trim() || input.partySize < 1) throw new AppError("invalid_input")
    const [rules, tables, existing] = await Promise.all([
      db8.orm.public.ReservationRule.where({ tenantId: resolved.tenantId }).all(),
      db8.orm.public.Table.where({ tenantId: resolved.tenantId }).all(),
      db8.orm.public.Reservation.where({ tenantId: resolved.tenantId }).all(),
    ])
    const slots = reservationSlots(
      rules.map((r) => ({
        weekday: r.weekday,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
        slotMinutes: r.slotMinutes,
        turnMinutes: r.turnMinutes,
        minPartySize: r.minPartySize,
        maxPartySize: r.maxPartySize,
      })),
      tables.map((t) => ({ id: t.id, capacity: t.capacity, area: t.area })),
      existing.map((r) => ({ tableId: r.tableId, startTs: r.startTs, endTs: r.endTs, status: r.status })),
      input.partySize,
      { startTs: input.startTs, endTs: input.endTs }
    )
    if (!slots.find((s) => s.tableId === input.tableId && s.startTs === input.startTs)) throw new AppError("conflict")
    const reservation = await db8.orm.public.Reservation.create({
      tenantId: resolved.tenantId,
      tableId: input.tableId,
      partySize: input.partySize,
      startTs: input.startTs,
      endTs: input.endTs,
      name: input.name.trim(),
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
      status: "confirmed",
    })
    await audit(c, { action: "reservations.reserved", targetType: "Reservation", targetId: reservation.id })
    return { id: reservation.id, status: "confirmed" }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
