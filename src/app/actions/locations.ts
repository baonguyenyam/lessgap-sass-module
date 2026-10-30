"use server"

import { z } from "zod"
import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** Branch CRUD (task 16.2): a tenant names its physical locations. */
export async function createLocation(input: { name: string; address?: string }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    const parsed = z.object({ name: z.string().min(1), address: z.string().optional() }).safeParse(input)
    if (!parsed.success) throw new AppError("invalid_input")
    const location = await db8.orm.public.Location.create({
      tenantId: m.tenantId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
    })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, { action: "booking.location_created", targetType: "Location", targetId: location.id })
    return { id: location.id }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
