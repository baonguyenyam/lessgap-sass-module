import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"
import { readNotifications, type NotificationCategory } from "@/platform/settings/user"

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

/** Event kind → the preference category that decides in-app delivery. */
const KIND_CATEGORY: Record<string, NotificationCategory> = {
  "order.placed": "orders",
  "booking.created": "appointments",
  "waitlist.joined": "appointments",
  "quote.accepted": "orders",
  "billing.invoice": "billing",
  "security.login": "security",
}

export function notificationCategory(kind: string): NotificationCategory {
  return KIND_CATEGORY[kind] ?? "workspace"
}

async function memberPrefs(userId: string) {
  const rows = await db8.orm.public.UserSetting.where({ userId }).all()
  return readNotifications(rows)
}

/** Unread rows for one member — their own plus broadcast — minus the
 * categories the member turned off in-app (requirement: every notification
 * respects the per-category in_app choice). */
export async function unreadMemberNotifications(tenantId: string, userId: string) {
  const [own, broadcast, prefs] = await Promise.all([
    db8.orm.public.MemberNotification.where((n) =>
      and(n.tenantId.eq(tenantId), n.userId.eq(userId), n.readAt.isNull())
    ).all(),
    db8.orm.public.MemberNotification.where((n) =>
      and(n.tenantId.eq(tenantId), n.userId.isNull(), n.readAt.isNull())
    ).all(),
    memberPrefs(userId),
  ])
  return [...own, ...broadcast]
    .filter((n) => prefs[notificationCategory(n.kind)]?.in_app !== false)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
