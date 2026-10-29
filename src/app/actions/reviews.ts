"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import type { TenantContext } from "@/platform/tenancy/context"
import { requireTenantContext } from "@/platform/tenancy/require-member"
import { verifyManageToken } from "@/lib/booking/manage-token"

/**
 * Reviews (task 11.2): only a real customer after a `completed` appointment
 * can leave one — the same manage-token that reschedules proves the visit —
 * and nothing goes on the site until the tenant approves it (status
 * `pending` → `published`/`rejected`, spec/03's publish model).
 */

export async function submitReview(input: { token: string; rating: number; body?: string }) {
  try {
    const verified = verifyManageToken(input.token)
    if (!verified) throw new AppError("unauthorized")
    const parsed = z
      .object({ rating: z.number().int().min(1).max(5), body: z.string().max(2000).optional() })
      .safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const appointment = await db8.orm.public.Appointment.where({ id: verified.appointmentId }).first()
    if (!appointment) throw new AppError("not_found")
    if (appointment.status !== "completed") throw new AppError("invalid_input")
    const c = systemContext(appointment.tenantId, "customer")
    const existing = await db8.orm.public.Review.where({ appointmentId: appointment.id }).first()
    if (existing) throw new AppError("invalid_input")
    const review = await db8.orm.public.Review.create({
      tenantId: appointment.tenantId,
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      rating: parsed.data.rating,
      body: parsed.data.body ?? null,
    })
    await audit(c, { action: "booking.review_submitted", targetType: "Review", targetId: review.id })
    return { id: review.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function moderateReview(input: { id: string; status: "published" | "rejected" }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const c: TenantContext = { tenantId: m.tenantId, actor: { kind: "member", userId: m.user.id, role: m.member.role } }
    const review = await db8.orm.public.Review.where({ id: input.id }).first()
    if (!review) throw new AppError("not_found")
    if (review.status !== "pending") throw new AppError("invalid_input")
    await db8.orm.public.Review.where({ id: review.id }).update({ status: input.status })
    await audit(c, {
      action: `booking.review_${input.status}`,
      targetType: "Review",
      targetId: review.id,
    })
    try {
      updateTag(`site:${review.tenantId}`)
    } catch {
      /* no request store — nothing to revalidate */
    }
    return {}
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
