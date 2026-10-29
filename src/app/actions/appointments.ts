"use server"

import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { and } from "@prisma/orm-postgres/orm-client"
import { AppError } from "@/platform/errors"
import { getEntitlements } from "@/platform/entitlements"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import type { TenantContext } from "@/platform/tenancy/context"

/** Appointment actions (task 5.3): a member manages the tenant's bookings —
 * creation re-checks availability (the database's exclusion constraint is
 * the last word on races), and every status change writes an
 * `AppointmentEvent` and an audit row. */
async function ctx(): Promise<TenantContext> {
  const c = await requireTenantContext("bookings", "manage")
  return { tenantId: c.tenantId, actor: { kind: "member", userId: c.user.id, role: c.member.role } }
}

async function guard(fn: (c: TenantContext) => Promise<unknown>): Promise<{ error?: string }> {
  try {
    const c = await ctx()
    await requireModule(c, "booking")
    await fn(c)
    revalidatePath("/t")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/** Whether a staff member (and optional resource) is free for the window —
 * the friendly check; the exclusion constraint catches what races past. */
async function slotFree(c: TenantContext, staffId: string, resourceId: string | null, startTs: string, endTs: string) {
  const clash = await db8.orm.public.Appointment.where((a) =>
    and(
      a.tenantId.eq(c.tenantId),
      a.staffId.eq(staffId),
      a.status.neq("canceled"),
      a.startTs.lt(endTs),
      a.endTs.gt(startTs)
    )
  ).first()
  if (clash) return false
  if (resourceId) {
    const resourceClash = await db8.orm.public.Appointment.where((a) =>
      and(
        a.tenantId.eq(c.tenantId),
        a.resourceId.eq(resourceId),
        a.status.neq("canceled"),
        a.startTs.lt(endTs),
        a.endTs.gt(startTs)
      )
    ).first()
    if (resourceClash) return false
  }
  return true
}

export async function createAppointment(input: {
  customerId: string
  staffId: string
  serviceId?: string
  resourceId?: string
  startTs: string
  endTs: string
  notes?: string
  source?: string
}) {
  return guard(async (c) => {
    if (!input.customerId || !input.staffId || !input.startTs || !input.endTs) {
      throw new AppError("invalid_input")
    }
    if (new Date(input.endTs) <= new Date(input.startTs)) throw new AppError("invalid_input", { field: "endTs" })
    const customer = await db8.orm.public.Customer.where({ tenantId: c.tenantId, id: input.customerId }).first()
    if (!customer) throw new AppError("invalid_input", { field: "customerId" })
    const staff = await db8.orm.public.StaffMember.where({ tenantId: c.tenantId, id: input.staffId }).first()
    if (!staff) throw new AppError("invalid_input", { field: "staffId" })
    // `booking.staff.max` caps appointments per staff; `booking.monthly`
    // caps the tenant's monthly bookings (metered, consumed at create).
    const staffMax = (await getEntitlements(c)).limit("booking.staff.max")
    if (staffMax !== null) {
      const n = await db8.orm.public.Appointment.where((a) =>
        and(a.tenantId.eq(c.tenantId), a.staffId.eq(input.staffId), a.status.neq("canceled"))
      ).aggregate((a) => ({ n: a.count() }))
      if (n.n >= staffMax) throw new AppError("feature_unavailable")
    }
    if (!(await slotFree(c, input.staffId, input.resourceId ?? null, input.startTs, input.endTs))) {
      throw new AppError("conflict")
    }
    const status = (await getEntitlements(c)).has("booking.manual_approval") ? "requested" : "confirmed"
    const appointment = await db8.orm.public.Appointment.create({
      tenantId: c.tenantId,
      customerId: input.customerId,
      staffId: input.staffId,
      serviceId: input.serviceId ?? null,
      resourceId: input.resourceId ?? null,
      startTs: input.startTs,
      endTs: input.endTs,
      status,
      source: input.source ?? "dashboard",
      notes: input.notes ?? null,
    })
    await db8.orm.public.AppointmentEvent.create({
      tenantId: c.tenantId,
      appointmentId: appointment.id,
      toStatus: status,
      actor: "member",
    })
    await audit(c, {
      action: "booking.appointment_created",
      targetType: "Appointment",
      targetId: appointment.id,
      data: { staffId: input.staffId, startTs: input.startTs, endTs: input.endTs, status },
    })
  })
}

const TERMINAL: Record<string, string[]> = {
  requested: ["confirmed", "canceled"],
  confirmed: ["completed", "canceled", "no_show"],
  completed: [],
  canceled: [],
  no_show: [],
}

export async function setAppointmentStatus(input: { appointmentId: string; toStatus: string; note?: string }) {
  return guard(async (c) => {
    const appointment = await db8.orm.public.Appointment.where({
      tenantId: c.tenantId,
      id: input.appointmentId,
    }).first()
    if (!appointment) throw new AppError("not_found")
    if (!(TERMINAL[appointment.status] ?? []).includes(input.toStatus))
      throw new AppError("invalid_input", { field: "toStatus" })
    const previous = appointment.status
    await db8.orm.public.Appointment.where({ id: appointment.id }).update({ status: input.toStatus })
    await db8.orm.public.AppointmentEvent.create({
      tenantId: c.tenantId,
      appointmentId: appointment.id,
      fromStatus: previous,
      toStatus: input.toStatus,
      actor: "member",
      note: input.note ?? null,
    })
    await audit(c, {
      action: `booking.appointment_${input.toStatus}`,
      targetType: "Appointment",
      targetId: appointment.id,
      data: { fromStatus: previous, toStatus: input.toStatus },
    })
  })
}

export async function addAvailabilityRule(input: {
  staffId?: string
  resourceId?: string
  weekday: number
  startMinute: number
  endMinute: number
}) {
  return guard(async (c) => {
    if (!input.staffId && !input.resourceId) throw new AppError("invalid_input")
    if (input.weekday < 0 || input.weekday > 6 || input.endMinute <= input.startMinute) {
      throw new AppError("invalid_input")
    }
    await db8.orm.public.AvailabilityRule.create({
      tenantId: c.tenantId,
      staffId: input.staffId ?? null,
      resourceId: input.resourceId ?? null,
      weekday: input.weekday,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
    })
    await audit(c, { action: "booking.rule_added", targetType: "AvailabilityRule", data: { ...input } })
  })
}

export async function removeAvailabilityRule(input: { id: string }) {
  return guard(async (c) => {
    const row = await db8.orm.public.AvailabilityRule.where({ tenantId: c.tenantId, id: input.id }).first()
    if (!row) throw new AppError("not_found")
    await db8.orm.public.AvailabilityRule.where({ id: row.id }).delete()
    await audit(c, { action: "booking.rule_removed", targetType: "AvailabilityRule", targetId: row.id })
  })
}

export async function addTimeOff(input: {
  staffId?: string
  resourceId?: string
  startTs: string
  endTs: string
  reason?: string
}) {
  return guard(async (c) => {
    if (!input.staffId && !input.resourceId) throw new AppError("invalid_input")
    if (new Date(input.endTs) <= new Date(input.startTs)) throw new AppError("invalid_input", { field: "endTs" })
    await db8.orm.public.TimeOff.create({
      tenantId: c.tenantId,
      staffId: input.staffId ?? null,
      resourceId: input.resourceId ?? null,
      startTs: input.startTs,
      endTs: input.endTs,
      reason: input.reason ?? null,
    })
    await audit(c, { action: "booking.time_off_added", targetType: "TimeOff", data: { ...input } })
  })
}
