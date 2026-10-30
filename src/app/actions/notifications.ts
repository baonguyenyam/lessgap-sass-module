"use server"

import { z } from "zod"
import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { nowTs } from "@/lib/timestamps"
import { AppError } from "@/platform/errors"
import { requireUser } from "@/lib/auth"

/** The member's own in-app notifications (phase 17.1): mark one read or all.
 * Scoped to the caller's tenant via the row's tenantId so a member cannot
 * mark another tenant's rows. */
const input = z.object({ id: z.string().min(1), tenantId: z.string().min(1) })

export async function markNotificationRead(values: z.input<typeof input>) {
  try {
    const user = await requireUser()
    const parsed = input.safeParse(values)
    if (!parsed.success) throw new AppError("invalid_input")
    const { id, tenantId } = parsed.data
    // Only a member of that tenant may mark the row; the row itself carries
    // the userId (own) or null (broadcast) — either may be read once.
    const member = await db8.orm.public.Member.where({ organizationId: tenantId, userId: user.id }).first()
    if (!member) throw new AppError("forbidden")
    await db8.orm.public.MemberNotification.where({ id, tenantId }).update({ readAt: nowTs() })
    return { ok: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}

export async function markAllNotificationsRead(values: { tenantId: string }) {
  try {
    const user = await requireUser()
    const member = await db8.orm.public.Member.where({ organizationId: values.tenantId, userId: user.id }).first()
    if (!member) throw new AppError("forbidden")
    const now = nowTs()
    const [own, broadcast] = await Promise.all([
      db8.orm.public.MemberNotification.where((n) =>
        and(n.tenantId.eq(values.tenantId), n.userId.eq(user.id), n.readAt.isNull())
      ).all(),
      db8.orm.public.MemberNotification.where((n) =>
        and(n.tenantId.eq(values.tenantId), n.userId.isNull(), n.readAt.isNull())
      ).all(),
    ])
    for (const row of [...own, ...broadcast]) {
      await db8.orm.public.MemberNotification.where({ id: row.id }).update({ readAt: now })
    }
    return { ok: true }
  } catch (error) {
    if (error instanceof AppError) return { error: error.code }
    throw error
  }
}
