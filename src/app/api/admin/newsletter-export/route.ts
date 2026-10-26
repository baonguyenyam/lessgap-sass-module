import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { isRoot } from "@/lib/roles"

/**
 * CSV export of the newsletter list, admin-only. Includes every state
 * (pending, confirmed, unsubscribed) with its timestamps, so the file is
 * also the consent record: requested_at + confirmed_at document the double
 * opt-in for each address.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isRoot(user.role)) {
    return new Response("Forbidden", { status: 403 })
  }

  const subs = await db8.orm.public.NewsletterSubscriber.orderBy((s) => s.createdAt.asc()).all()

  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = ["email,source,requested_at,confirmed_at,unsubscribed_at"]
  for (const s of subs) {
    lines.push(
      [
        esc(s.email),
        esc(s.source),
        toDate(s.createdAt).toISOString(),
        toDate(s.confirmedAt)?.toISOString() ?? "",
        toDate(s.unsubscribedAt)?.toISOString() ?? "",
      ].join(",")
    )
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"',
    },
  })
}
