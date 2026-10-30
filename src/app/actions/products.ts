"use server"

import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** Sellable-definitions CRUD (task 16.4): the `Package`/`Membership` rows a
 * `buyPackage`/`activateMembership` needs something to sell from. */
export async function createPackage(input: { name: string; sessions: number; priceCents: number }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z.object({ name: z.string().min(1), sessions: z.number().int().positive(), priceCents: z.number().int().nonnegative() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const pkg = await db8.orm.public.Package.create({
      tenantId: m.tenantId,
      name: parsed.data.name,
      sessions: parsed.data.sessions,
      priceCents: parsed.data.priceCents,
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "booking.package_created", targetType: "Package", targetId: pkg.id })
    return { id: pkg.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function createMembership(input: { name: string; priceCents: number }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z.object({ name: z.string().min(1), priceCents: z.number().int().nonnegative() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const mem = await db8.orm.public.Membership.create({
      tenantId: m.tenantId,
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "booking.membership_created", targetType: "Membership", targetId: mem.id })
    return { id: mem.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
