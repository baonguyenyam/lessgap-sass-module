"use server"

import { revalidatePath } from "next/cache"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { getEntitlements } from "@/platform/entitlements"
import { requireModule } from "@/platform/modules/runtime"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { upsertCustomer } from "@/platform/booking/customer"
import { notify } from "@/platform/notify"
import { availableSlots } from "@/lib/availability"
import { signManageToken, verifyManageToken } from "@/lib/booking/manage-token"
import { icsFile } from "@/lib/ics"
import { resolveHost } from "@/platform/tenancy/host"
import { headers } from "next/headers"

/** The site booking flow (task 5.4, spec/07): a visitor books a service —
 * the slot re-checks through `availableSlots` (the exclusion constraint is
 * the last word on races), the customer upserts by email then phone, and a
 * confirmation email carries an `.ics` and a signed manage link. */
async function siteCtx(): Promise<{ tenantId: string; slug: string; origin: string }> {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") throw new AppError("not_found")
  return { tenantId: resolved.tenantId, slug: resolved.slug, origin: `https://${host}` }
}

export async function bookAppointment(input: {
  serviceId: string
  staffId?: string
  startTs: string
  endTs: string
  name: string
  email?: string
  phone?: string
  language?: string
  marketingConsent?: boolean
  smsConsent?: boolean
}) {
  try {
    const site = await siteCtx()
    const c = systemContext(site.tenantId, "customer")
    await requireModule(c, "booking")
    if (!input.name.trim() || (!input.email && !input.phone)) throw new AppError("invalid_input")
    const service = await db8.orm.public.Service.where({ tenantId: site.tenantId, id: input.serviceId }).first()
    if (!service) throw new AppError("invalid_input", { field: "serviceId" })
    // The requested window must still be a real slot — the pure function
    // answers authoritatively, the constraint catches what races past.
    const [rules, timeOff, existing, staff] = await Promise.all([
      db8.orm.public.AvailabilityRule.where({ tenantId: site.tenantId }).all(),
      db8.orm.public.TimeOff.where({ tenantId: site.tenantId }).all(),
      db8.orm.public.Appointment.where({ tenantId: site.tenantId }).all(),
      db8.orm.public.StaffMember.where({ tenantId: site.tenantId }).all(),
    ])
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
      { durationMinutes: service.durationMinutes },
      input.staffId ?? "any",
      { startTs: input.startTs, endTs: input.endTs },
      "UTC"
    )
    const match = slots.find((s) => s.startTs === input.startTs && s.endTs === input.endTs)
    if (!match) throw new AppError("conflict")
    const customerId = await upsertCustomer(site.tenantId, {
      name: input.name.trim(),
      email: input.email,
      phone: input.phone,
      language: input.language,
      marketingConsent: input.marketingConsent,
      smsConsent: input.smsConsent,
      source: "site",
    })
    const status = (await getEntitlements(c)).has("booking.manual_approval") ? "requested" : "confirmed"
    const appointment = await db8.orm.public.Appointment.create({
      tenantId: site.tenantId,
      customerId,
      staffId: match.staffId,
      serviceId: input.serviceId,
      startTs: input.startTs,
      endTs: input.endTs,
      status,
      source: "site",
    })
    await db8.orm.public.AppointmentEvent.create({
      tenantId: site.tenantId,
      appointmentId: appointment.id,
      toStatus: status,
      actor: "customer",
    })
    const staffName = staff.find((s) => s.id === match.staffId)?.name ?? ""
    const manageUrl = `${site.origin}/sites/${site.slug}/book/manage/${signManageToken(appointment.id)}`
    const ics = icsFile({
      uid: appointment.id,
      title: service.name,
      startTs: input.startTs,
      endTs: input.endTs,
      description: `${staffName} · ${input.name}`,
    })
    if (input.email) {
      await notify(c, "booking.confirmation", input.email, {
        subject: `Your booking: ${service.name}`,
        html: `<p>Hi ${input.name},</p><p>${service.name} is booked with ${staffName} at ${new Date(input.startTs).toUTCString()}.</p><p><a href="${manageUrl}">Manage your booking</a></p>`,
        text: `Booking: ${service.name} with ${staffName} at ${input.startTs}. Manage: ${manageUrl}`,
      })
    }
    await audit(c, {
      action: "booking.appointment_booked",
      targetType: "Appointment",
      targetId: appointment.id,
      data: { staffId: match.staffId, startTs: input.startTs, status, source: "site" },
    })
    void ics
    return { id: appointment.id, status }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function manageAppointment(input: { token: string; toStatus?: string; startTs?: string; endTs?: string }) {
  try {
    const verified = verifyManageToken(input.token)
    if (!verified) throw new AppError("unauthorized")
    const appointment = await db8.orm.public.Appointment.where({ id: verified.appointmentId }).first()
    if (!appointment) throw new AppError("not_found")
    const c = systemContext(appointment.tenantId, "customer")
    if (input.toStatus === "canceled") {
      if (["completed", "canceled"].includes(appointment.status)) throw new AppError("invalid_input")
      const previous = appointment.status
      await db8.orm.public.Appointment.where({ id: appointment.id }).update({ status: "canceled" })
      await db8.orm.public.AppointmentEvent.create({
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        fromStatus: previous,
        toStatus: "canceled",
        actor: "customer",
      })
      await audit(c, { action: "booking.appointment_canceled", targetType: "Appointment", targetId: appointment.id })
    } else if (input.startTs && input.endTs) {
      // Reschedule — re-check the slot is still free.
      const [rules, timeOff, existing] = await Promise.all([
        db8.orm.public.AvailabilityRule.where({ tenantId: appointment.tenantId }).all(),
        db8.orm.public.TimeOff.where({ tenantId: appointment.tenantId }).all(),
        db8.orm.public.Appointment.where({ tenantId: appointment.tenantId }).all(),
      ])
      const service = appointment.serviceId
        ? await db8.orm.public.Service.where({ id: appointment.serviceId }).first()
        : null
      const slots = availableSlots(
        rules.map((r) => ({
          weekday: r.weekday,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          staffId: r.staffId,
          resourceId: r.resourceId,
        })),
        timeOff.map((t) => ({ staffId: t.staffId, resourceId: t.resourceId, startTs: t.startTs, endTs: t.endTs })),
        existing
          .filter((a) => a.id !== appointment.id)
          .map((a) => ({
            staffId: a.staffId,
            resourceId: a.resourceId,
            startTs: a.startTs,
            endTs: a.endTs,
            status: a.status,
          })),
        { durationMinutes: service?.durationMinutes ?? 60 },
        appointment.staffId,
        { startTs: input.startTs, endTs: input.endTs },
        "UTC"
      )
      if (!slots.find((s) => s.startTs === input.startTs)) throw new AppError("conflict")
      await db8.orm.public.Appointment.where({ id: appointment.id }).update({
        startTs: input.startTs,
        endTs: input.endTs,
      })
      await db8.orm.public.AppointmentEvent.create({
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        toStatus: appointment.status,
        actor: "customer",
        note: "rescheduled",
      })
      await audit(c, { action: "booking.appointment_rescheduled", targetType: "Appointment", targetId: appointment.id })
    }
    revalidatePath("/sites")
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
