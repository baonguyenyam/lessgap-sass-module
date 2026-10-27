"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { removeNewsletterContact } from "@/lib/email"
import { isRoot } from "@/lib/roles"
import { nowTs } from "@/lib/timestamps"

/**
 * Unsubscribes newsletter addresses from the admin list. ROOT only, like the
 * admin panel. Rows already unsubscribed are left as they are; each address is
 * also removed from the mailing audience, and a failure there is logged
 * without undoing the unsubscribe here, the same as the one-click link.
 */
export async function unsubscribeSubscribers(ids: string[]): Promise<{ changed: number }> {
  const viewer = await getCurrentUser()
  if (!viewer || !isRoot(viewer.role)) throw new Error("Unauthorized")
  const unique = [...new Set(ids)].slice(0, 500)
  if (unique.length === 0) return { changed: 0 }

  const { NewsletterSubscriber } = db8.orm.public
  const targets = await NewsletterSubscriber.select("id", "email")
    .where((s) => s.id.in(unique))
    .where((s) => s.unsubscribedAt.isNull())
    .where((s) => s.tenantId.isNull())
    .all()
  if (targets.length === 0) return { changed: 0 }

  const changed = await NewsletterSubscriber.where((s) => s.id.in(targets.map((t) => t.id))).updateAndCount({
    unsubscribedAt: nowTs(),
  })
  for (const target of targets) {
    await removeNewsletterContact(target.email).catch((error) =>
      console.error("[newsletter] audience removal failed:", error)
    )
  }
  revalidatePath("/admin/newsletter")
  return { changed }
}
