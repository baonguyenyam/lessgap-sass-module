"use server"

import { db8 } from "@/lib/db8"
import { AppError } from "@/platform/errors"
import { audit } from "@/platform/audit"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** Waitlist moderation (task 16.5): a member marks a waiting entry canceled
 * (the customer won't come) or booked (they got a slot elsewhere). */
export async function moderateWaitlist(input: { entryId: string; status: "canceled" | "booked" }) {
  try {
    const m = await requireTenantContext("bookings", "manage")
    if (!["canceled", "booked"].includes(input.status)) throw new AppError("invalid_input")
    const entry = await db8.orm.public.WaitlistEntry.where({ id: input.entryId }).first()
    if (!entry || entry.tenantId !== m.tenantId) throw new AppError("not_found")
    await db8.orm.public.WaitlistEntry.where({ id: entry.id }).update({ status: input.status })
    const c = { tenantId: m.tenantId, actor: { kind: "member" as const, userId: m.user.id, role: m.member.role } }
    await audit(c, {
      action: `booking.waitlist_${input.status}`,
      targetType: "WaitlistEntry",
      targetId: entry.id,
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
