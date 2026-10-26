import { getFormatter, getTranslations } from "next-intl/server"
import { getCurrentSessionId, requireUser } from "@/lib/auth"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { buildAccountLog, type AccountLogEvent } from "@/lib/account-log"
import { formatDevice, formatIpAddress } from "@/lib/user-agent"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Product names stay as they are; the password is a word, so it is translated.
const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
}

/** Settings → Logs: the account history `buildAccountLog` reads from the database. */
export default async function LogsSettingsPage() {
  const currentUser = await requireUser()
  const t = await getTranslations("dashboard.settings.logs")
  const format = await getFormatter()
  const userId = currentUser.id
  const { Account, Session, TwoFactor, User } = db8.orm.public

  const [user, accounts, sessions, twoFactor, currentSessionId] = await Promise.all([
    User.select("createdAt", "twoFactorEnabled").where({ id: userId }).first(),
    Account.select("providerId", "createdAt").where({ userId }).all(),
    Session.select("id", "createdAt", "expiresAt", "userAgent", "ipAddress", "switchedBy")
      .where({ userId })
      .orderBy((s) => s.createdAt.desc())
      .limit(50)
      .all(),
    TwoFactor.select("createdAt").where({ userId }).first(),
    getCurrentSessionId(),
  ])
  if (!user) return null

  const events = buildAccountLog({
    createdAt: toDate(user.createdAt),
    accounts: accounts.map((a) => ({ providerId: a.providerId, createdAt: toDate(a.createdAt) })),
    twoFactorSince: user.twoFactorEnabled && twoFactor ? toDate(twoFactor.createdAt) : null,
    sessions: sessions.map((s) => ({ ...s, createdAt: toDate(s.createdAt), expiresAt: toDate(s.expiresAt) })),
    currentSessionId,
    now: new Date(),
  })

  const describe = (event: AccountLogEvent) => {
    switch (event.kind) {
      case "account-created":
        return t("accountCreated")
      case "method-added":
        return event.providerId === "credential"
          ? t("passwordAdded")
          : t("methodAdded", { method: PROVIDER_LABELS[event.providerId] ?? event.providerId })
      case "two-factor-enabled":
        return t("twoFactorEnabled")
      case "signed-in":
        return t(event.switched ? "switchedIn" : "signedIn", {
          device: formatDevice(event.userAgent) ?? t("unknownDevice"),
        })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y divide-border text-sm">
          {events.map((event, index) => (
            <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <div className="min-w-0">
                <span className="font-medium">{describe(event)}</span>
                {event.kind === "signed-in" && (
                  <span className="ml-2 inline-flex gap-1 align-middle">
                    {event.current && <Badge variant="secondary">{t("thisDevice")}</Badge>}
                    {!event.active && <Badge variant="outline">{t("ended")}</Badge>}
                  </span>
                )}
                {event.kind === "signed-in" && formatIpAddress(event.ipAddress) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatIpAddress(event.ipAddress)}</p>
                )}
              </div>
              <time dateTime={event.at.toISOString()} className="text-xs text-muted-foreground">
                {format.dateTime(event.at, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
