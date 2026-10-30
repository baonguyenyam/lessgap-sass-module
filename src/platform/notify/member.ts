import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"

/** In-app member notifications (phase 17.1): one row per event a member
 * should see — order placed, booking made, waitlist joined, quote accepted.
 * `userId` addresses one member; null posts it to everyone in the tenant. */
export async function notifyMember(
  tenantId: string,
  kind: string,
  title: string,
  opts: { userId?: string; body?: string; href?: string } = {}
): Promise<void> {
  try {
    await db8.orm.public.MemberNotification.create({
      tenantId,
      userId: opts.userId ?? null,
      kind,
      title,
      body: opts.body ?? null,
      href: opts.href ?? null,
    })
  } catch {
    // A notification must never break the business write that raised it.
  }
}

/** Unread rows for one member — their own plus broadcast-to-everyone rows. */
export async function unreadMemberNotifications(tenantId: string, userId: string) {
  const [own, broadcast] = await Promise.all([
    db8.orm.public.MemberNotification.where((n) =>
      and(n.tenantId.eq(tenantId), n.userId.eq(userId), n.readAt.isNull())
    ).all(),
    db8.orm.public.MemberNotification.where((n) =>
      and(n.tenantId.eq(tenantId), n.userId.isNull(), n.readAt.isNull())
    ).all(),
  ])
  return [...own, ...broadcast].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
