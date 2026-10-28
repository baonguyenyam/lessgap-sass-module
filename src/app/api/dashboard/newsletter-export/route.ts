import { toDate } from "@/lib/timestamps"
import { consumeLimit } from "@/platform/entitlements/usage"
import { AppError } from "@/platform/errors"
import { tenantSubscribers } from "@/platform/newsletter/tenant-list"
import { requireTenantContext } from "@/platform/tenancy/require-member"

/** This workspace's subscribers as CSV. */
export async function GET() {
  let tenantId: string
  try {
    tenantId = (await requireTenantContext("newsletter", "view")).tenantId
  } catch {
    return new Response("Not found", { status: 404 })
  }
  try {
    await consumeLimit({ tenantId }, "newsletter.exports.monthly", 1)
  } catch (error) {
    if (error instanceof AppError && error.code === "limit_reached") {
      return new Response("Export limit reached for this month", { status: 429 })
    }
    throw error
  }
  const subs = await tenantSubscribers(tenantId)
    .orderBy((s) => s.createdAt.asc())
    .all()
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
