"use server"

import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { systemContext } from "@/platform/tenancy/context"
import { requireModule } from "@/platform/modules/runtime"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/**
 * Memberships and packages (task 12.2, roadmap "Later"): a `Package` is a
 * prepaid bundle of sessions — a customer buys one and spends sessions
 * against appointments, the same ledger-twin pattern as the gift card.
 * A `Membership` is a recurring charge for member perks.
 */

function memberCtx(m: Awaited<ReturnType<typeof requireTenantContext>>) {
  return { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
}

export async function buyPackage(input: { packageId: string; customerId: string }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z.object({ packageId: z.string(), customerId: z.string() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const pkg = await db8.orm.public.Package.where({ id: parsed.data.packageId }).first()
    if (!pkg) throw new AppError("not_found")
    const holding = await db8.orm.public.CustomerPackage.create({
      tenantId: m.tenantId,
      packageId: pkg.id,
      customerId: parsed.data.customerId,
      sessionsLeft: pkg.sessions,
    })
    await db8.orm.public.PackageLedger.create({
      tenantId: m.tenantId,
      holdingId: holding.id,
      deltaSessions: pkg.sessions,
      reason: "sold",
    })
    await audit(memberCtx(m), { action: "booking.package_sold", targetType: "CustomerPackage", targetId: holding.id })
    return { id: holding.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function spendPackage(input: { holdingId: string; appointmentId: string }) {
  try {
    const parsed = z.object({ holdingId: z.string(), appointmentId: z.string() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const holding = await db8.orm.public.CustomerPackage.where({ id: parsed.data.holdingId }).first()
    if (!holding || !holding.active) throw new AppError("not_found")
    const appointment = await db8.orm.public.Appointment.where({ id: parsed.data.appointmentId }).first()
    if (!appointment || appointment.tenantId !== holding.tenantId) throw new AppError("not_found")
    const c = systemContext(holding.tenantId, "customer")
    await requireModule(c, "booking")
    const already = await db8.orm.public.PackageLedger.where({
      holdingId: holding.id,
      appointmentId: appointment.id,
    }).first()
    if (already) throw new AppError("conflict")
    if (holding.sessionsLeft < 1) throw new AppError("invalid_input")
    await db8.orm.public.PackageLedger.create({
      tenantId: holding.tenantId,
      holdingId: holding.id,
      deltaSessions: -1,
      reason: "spent",
      appointmentId: appointment.id,
    })
    await db8.orm.public.CustomerPackage.where({ id: holding.id }).update({ sessionsLeft: holding.sessionsLeft - 1 })
    await audit(c, {
      action: "booking.package_spent",
      targetType: "CustomerPackage",
      targetId: holding.id,
      data: { appointmentId: appointment.id },
    })
    return { sessionsLeft: holding.sessionsLeft - 1 }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function activateMembership(input: { membershipId: string; customerId: string }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z.object({ membershipId: z.string(), customerId: z.string() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const membership = await db8.orm.public.Membership.where({ id: parsed.data.membershipId }).first()
    if (!membership) throw new AppError("not_found")
    const holding = await db8.orm.public.CustomerMembership.create({
      tenantId: m.tenantId,
      membershipId: membership.id,
      customerId: parsed.data.customerId,
    })
    await db8.orm.public.MembershipLedger.create({
      tenantId: m.tenantId,
      holdingId: holding.id,
      deltaCents: -membership.priceCents,
      reason: "joined",
    })
    await audit(memberCtx(m), {
      action: "booking.membership_activated",
      targetType: "CustomerMembership",
      targetId: holding.id,
    })
    return { id: holding.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function billMembership(input: { holdingId: string }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const holding = await db8.orm.public.CustomerMembership.where({ id: input.holdingId }).first()
    if (!holding || !holding.active) throw new AppError("not_found")
    const membership = await db8.orm.public.Membership.where({ id: holding.membershipId }).first()
    if (!membership) throw new AppError("not_found")
    await db8.orm.public.MembershipLedger.create({
      tenantId: m.tenantId,
      holdingId: holding.id,
      deltaCents: -membership.priceCents,
      reason: "billed",
    })
    await audit(memberCtx(m), {
      action: "booking.membership_billed",
      targetType: "CustomerMembership",
      targetId: holding.id,
    })
    return { billedCents: membership.priceCents }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
