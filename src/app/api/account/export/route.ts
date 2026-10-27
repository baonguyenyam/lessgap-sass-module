import { getCurrentUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { checkRateLimit } from "@/lib/rate-limit"
import { accountExportFileName, buildAccountExport } from "@/lib/account-export"

/**
 * Settings → Backup: the signed-in user's own data as a JSON download. What
 * goes in the file is decided by `buildAccountExport`, an allow-list.
 */
export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return new Response("Unauthorized", { status: 401 })
  if (!(await checkRateLimit(`account-export:${currentUser.id}`, 5))) {
    return new Response("Too many requests", { status: 429 })
  }

  const { Account, NewsletterSubscriber, Project, Purchase, Session, Subscription, User } = db8.orm.public
  const userId = currentUser.id
  const user = await User.select(
    "id",
    "email",
    "name",
    "image",
    "role",
    "emailVerified",
    "twoFactorEnabled",
    "createdAt",
    "updatedAt"
  )
    .where({ id: userId })
    .first()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const [accounts, sessions, projects, subscription, purchases, newsletter] = await Promise.all([
    Account.select("providerId", "createdAt").where({ userId }).all(),
    Session.select("createdAt", "expiresAt", "ipAddress", "userAgent").where({ userId }).all(),
    Project.select("id", "name", "description", "createdAt", "updatedAt").where({ userId }).all(),
    Subscription.select(
      "status",
      "currentPeriodStart",
      "currentPeriodEnd",
      "cancelAtPeriodEnd",
      "trialEndsAt",
      "createdAt"
    )
      .include("plan", (p) => p.select("name"))
      .where({ userId })
      .first(),
    Purchase.select("amount", "currency", "status", "createdAt")
      .include("plan", (p) => p.select("name"))
      .where({ userId })
      .all(),
    NewsletterSubscriber.select("source", "createdAt", "confirmedAt", "unsubscribedAt")
      .where({ email: user.email })
      .first(),
  ])

  const exportedAt = new Date()
  const file = buildAccountExport(
    { user, accounts, sessions, projects, subscription, purchases, newsletter },
    exportedAt
  )

  return new Response(JSON.stringify(file, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${accountExportFileName(exportedAt)}"`,
      "Cache-Control": "no-store",
    },
  })
}
