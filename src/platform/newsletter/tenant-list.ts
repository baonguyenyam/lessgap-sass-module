import { and } from "@prisma/orm-postgres/orm-client"
import { db8 } from "@/lib/db8"

/** One workspace's subscribers. Every tenant query starts here, so none can forget the scope. */
export function tenantSubscribers(tenantId: string) {
  return db8.orm.public.NewsletterSubscriber.where({ tenantId })
}

export function byStatus(list: ReturnType<typeof tenantSubscribers>, status: string | undefined) {
  if (status === "pending") return list.where((s) => and(s.confirmedAt.isNull(), s.unsubscribedAt.isNull()))
  if (status === "confirmed") return list.where((s) => and(s.confirmedAt.isNotNull(), s.unsubscribedAt.isNull()))
  if (status === "unsubscribed") return list.where((s) => s.unsubscribedAt.isNotNull())
  return list
}
