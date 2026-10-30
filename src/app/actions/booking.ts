"use server"

import { revalidatePath } from "next/cache"
import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { getEntitlements } from "@/platform/entitlements"
import { requireModule } from "@/platform/modules/runtime"
import { publishBookingChange } from "@/platform/realtime/pusher"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import type { TenantContext } from "@/platform/tenancy/context"
import { upsertCustomer } from "@/platform/booking/customer"
import { canCharge, createCheckout } from "@/platform/payments/connect"
import { notify } from "@/platform/notify"
import { availableSlots } from "@/lib/availability"
import { signManageToken, verifyManageToken } from "@/lib/booking/manage-token"
import { icsFile } from "@/lib/ics"
import { z } from "zod"
import { resolveHost } from "@/platform/tenancy/host"
import { bookingInputError } from "@/lib/booking/dental"

/** Postgres 23P01 — an exclusion constraint refused the row. */
function isExclusionViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } }
  return (
    e?.code === "23P01" ||
    e?.cause?.code === "23P01" ||
    String((error as Error)?.message).includes("appointment_no_double")
  )
}
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
  notes?: string
}) {
  try {
    const site = await siteCtx()
    const c = systemContext(site.tenantId, "customer")
    await requireModule(c, "booking")
    if (!input.name.trim() || (!input.email && !input.phone)) throw new AppError("invalid_input")
    const [service, tenant] = await Promise.all([
      db8.orm.public.Service.where({ tenantId: site.tenantId, id: input.serviceId }).first(),
      db8.orm.public.Tenant.where({ id: site.tenantId }).first(),
    ])
    if (!service) throw new AppError("invalid_input", { field: "serviceId" })
    // Dental tenants never take free-text notes — clinical details have no
    // place in this platform (spec/10).
    const phiError = bookingInputError({ notes: input.notes }, tenant?.verticalKey ?? "generic")
    if (phiError) throw new AppError("invalid_input", { field: "notes" })
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
    // A deposit-gated service (booking.deposits + Service.depositCents)
    // stays `requested` — unpaid — until the Stripe session succeeds and
    // the webhook flips it (spec/05, hidden not broken).
    const depositDue =
      service.depositCents != null &&
      service.depositCents > 0 &&
      (await getEntitlements(c)).has("booking.deposits") &&
      tenant != null &&
      canCharge(tenant)
    const status = depositDue
      ? "requested"
      : (await getEntitlements(c)).has("booking.manual_approval")
        ? "requested"
        : "confirmed"
    let appointment
    try {
      const staffMember = await db8.orm.public.StaffMember.where({ id: match.staffId }).first()
      appointment = await db8.orm.public.Appointment.create({
        tenantId: site.tenantId,
        customerId,
        staffId: match.staffId,
        locationId: staffMember?.locationId ?? null,
        serviceId: input.serviceId,
        startTs: input.startTs,
        endTs: input.endTs,
        status,
        source: "site",
        notes: input.notes ?? null,
      })
    } catch (error) {
      // The exclusion constraint is the race backstop (decision 5-A): two
      // requests that both pass the slot check — one loses here.
      if (isExclusionViolation(error)) throw new AppError("conflict")
      throw error
    }
    await db8.orm.public.AppointmentEvent.create({
      tenantId: site.tenantId,
      appointmentId: appointment.id,
      toStatus: status,
      actor: "customer",
    })
    const staffName = staff.find((s) => s.id === match.staffId)?.name ?? ""
    const manageUrl = `${site.origin}/sites/${site.slug}/book/manage/${signManageToken(appointment.id)}`
    if (depositDue) {
      const checkout = await createCheckout(c, {
        kind: "deposit",
        amountCents: service.depositCents!,
        description: `${service.name} deposit`,
        successUrl: `${site.origin}/sites/${site.slug}/book/confirmed?a=${appointment.id}`,
        cancelUrl: `${site.origin}/sites/${site.slug}/book`,
        customerEmail: input.email,
        appointmentId: appointment.id,
      })
      return { id: appointment.id, checkoutUrl: checkout.checkoutUrl }
    }
    const ics = icsFile({
      uid: appointment.id,
      title: service.name,
      startTs: input.startTs,
      endTs: input.endTs,
      description: `${staffName} · ${input.name}`,
    })
    if (input.email) {
      await notify(c, "booking.confirmation", input.email, {
        name: input.name,
        service: service.name,
        staff: staffName,
        time: new Date(input.startTs).toUTCString(),
        manageUrl,
      })
    }
    await audit(c, {
      action: "booking.appointment_booked",
      targetType: "Appointment",
      targetId: appointment.id,
      data: { staffId: match.staffId, startTs: input.startTs, status, source: "site" },
    })
    void ics
    void publishBookingChange(site.tenantId, { appointmentId: appointment.id, status })
    // The waitlist's booked transition (task 14.1): a customer who booked
    // from a notify's link (or on their own) clears their entry.
    const bookedDay = input.startTs.slice(0, 10)
    const waiting = await db8.orm.public.WaitlistEntry.where((w) =>
      and(w.tenantId.eq(site.tenantId), w.wantedDate.eq(bookedDay), w.status.in(["waiting", "notified"]))
    ).all()
    for (const entry of waiting) {
      if (input.email && entry.email === input.email) {
        await db8.orm.public.WaitlistEntry.where({ id: entry.id }).update({ status: "booked" })
      }
    }
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
      await notifyWaitlist(c, appointment)
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
      void publishBookingChange(appointment.tenantId, { appointmentId: appointment.id, status: appointment.status })
    }
    // Specs and jobs call the action without a request store — revalidate
    // when there is one, never break the write over it.
    try {
      revalidatePath("/sites")
    } catch {
      /* no request store — nothing to revalidate */
    }
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/**
 * Join the waitlist when a day is fully booked (task 11.1). The visitor
 * leaves an email or phone; the next free slot is offered to them first —
 * `manageAppointment`'s cancel calls `notifyWaitlist`.
 */
export async function joinWaitlist(input: { email?: string; phone?: string; serviceId?: string; wantedDate: string }) {
  try {
    const site = await siteCtx()
    const c = systemContext(site.tenantId, "customer")
    await requireModule(c, "booking")
    const parsed = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().min(5).optional(),
        serviceId: z.string().optional(),
        wantedDate: z.string().min(8),
      })
      .safeParse(input)
    if (!parsed.success || (!parsed.data.email && !parsed.data.phone)) throw new AppError("invalid_input")
    const entry = await db8.orm.public.WaitlistEntry.create({
      tenantId: c.tenantId,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      serviceId: parsed.data.serviceId ?? null,
      wantedDate: parsed.data.wantedDate,
    })
    await audit(c, { action: "booking.waitlist_joined", targetType: "WaitlistEntry", targetId: entry.id })
    return { id: entry.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

/**
 * A freed slot's waitlist gets the first offer — one notification per
 * waiting entry on the freed day, then the entry goes `notified` (no
 * repeat sends).
 */
async function notifyWaitlist(c: TenantContext, appointment: { id: string; tenantId: string; startTs: string }) {
  const day = appointment.startTs.slice(0, 10)
  const waiting = await db8.orm.public.WaitlistEntry.where({
    tenantId: appointment.tenantId,
    wantedDate: day,
    status: "waiting",
  }).all()
  const site = await siteCtx()
  for (const entry of waiting) {
    const bookUrl = `${site.origin}/sites/${site.slug}/book`
    if (entry.email) {
      await notify(c, "booking.waitlist_open", entry.email, { day, bookUrl })
    } else if (entry.phone) {
      await notify(c, "booking.waitlist_open", entry.phone, { day, bookUrl })
    }
    await db8.orm.public.WaitlistEntry.where({ id: entry.id }).update({ status: "notified" })
  }
}
