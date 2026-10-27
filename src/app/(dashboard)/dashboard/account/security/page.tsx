import { KeyRound, Link2, Mail, Unlink } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TwoFactorCard } from "@/components/settings/two-factor-card"
import { ActiveSessions } from "@/components/settings/active-sessions"
import { SettingsMessage } from "@/components/settings/settings-message"
import { PendingButton } from "@/components/auth/pending-button"
import { changeEmail, linkProvider, unlinkProvider, updatePassword } from "@/app/actions/account"
import { enabledOAuthProviders } from "@/lib/oauth-providers"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
}

/**
 * Settings → Security: every way into the account and the evidence of who
 * used one. The account actions redirect back here with a result code, and so
 * does linking a provider after the OAuth round trip.
 */
export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const currentUser = await requireUser()
  const t = await getTranslations("dashboard.settings")

  const user = await db8.orm.public.User.select("twoFactorEnabled")
    .include("accounts", (a) => a.select("id", "providerId"))
    .where({ id: currentUser.id })
    .first()
  if (!user) redirect("/login")

  // Since 2.0 the password is a row in Account, not a column on User, so
  // "has a password" and "which providers are linked" are both read from the
  // same list instead of from two different places.
  const hasPassword = user.accounts.some((a) => a.providerId === "credential")
  const linked = new Map(user.accounts.map((a) => [a.providerId, a.id]))
  // A provider without its keys cannot be connected, so its row would offer a
  // button that fails. One already linked stays listed, to be disconnected.
  const enabled: string[] = enabledOAuthProviders()
  const providerRows = Object.entries(PROVIDER_LABELS).filter(
    ([provider]) => enabled.includes(provider) || linked.has(provider)
  )

  return (
    <div className="space-y-6">
      <SettingsMessage searchParams={searchParams} />

      <Card>
        <CardHeader>
          <CardTitle>{t("methodsTitle")}</CardTitle>
          <CardDescription>{t("methodsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {providerRows.map(([provider, label]) => {
            const accountId = linked.get(provider)
            return (
              <div key={provider} className="flex items-center justify-between gap-2 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{label}</span>
                  {accountId && <Badge variant="secondary">{t("connected")}</Badge>}
                </div>
                {accountId ? (
                  <form action={unlinkProvider}>
                    <input type="hidden" name="accountId" value={accountId} />
                    <PendingButton variant="outline">
                      <Unlink />
                      {t("disconnect")}
                    </PendingButton>
                  </form>
                ) : (
                  <form action={linkProvider}>
                    <input type="hidden" name="provider" value={provider} />
                    <PendingButton variant="outline">
                      <Link2 />
                      {t("connect")}
                    </PendingButton>
                  </form>
                )}
              </div>
            )
          })}

          {/* The address lives with the other ways in, not with the display
              name: it is a credential, and changing it is a two-step round trip
              rather than a field you save. Its own form, because the profile
              form cannot contain another one. */}
          <div className="space-y-2 border-b border-border pb-4">
            <Label htmlFor="new-email">{t("email.label")}</Label>
            <form action={changeEmail} className="flex flex-wrap items-center gap-2">
              <Input
                id="new-email"
                name="email"
                type="email"
                placeholder={t("email.placeholder")}
                className="w-full sm:w-64"
                required
              />
              <PendingButton variant="outline">
                <Mail />
                {t("email.submit")}
              </PendingButton>
            </form>
            <p className="text-xs text-muted-foreground">{t("email.hint")}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{t("password")}</span>
              {hasPassword ? (
                <Badge variant="secondary">{t("passwordSet")}</Badge>
              ) : (
                <Badge variant="outline">{t("passwordNotSet")}</Badge>
              )}
            </div>
            <form action={updatePassword} className="flex flex-wrap items-center gap-2">
              {hasPassword && (
                <Input
                  name="currentPassword"
                  type="password"
                  aria-label={t("currentPasswordPlaceholder")}
                  placeholder={t("currentPasswordPlaceholder")}
                  className="w-full sm:w-64"
                  autoComplete="current-password"
                  required
                />
              )}
              <Input
                name="password"
                type="password"
                aria-label={hasPassword ? t("newPasswordPlaceholder") : t("setPasswordPlaceholder")}
                placeholder={hasPassword ? t("newPasswordPlaceholder") : t("setPasswordPlaceholder")}
                className="w-full sm:w-64"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
              />
              <PendingButton variant="outline">
                <KeyRound />
                {hasPassword ? t("changePassword") : t("setPassword")}
              </PendingButton>
            </form>
            {!hasPassword && <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Between the sign-in methods and the account facts, because that is
          where someone looking for it looks: it belongs to how you get in. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("twoFactor.title")}</CardTitle>
          <CardDescription>{t("twoFactor.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorCard
            enabled={user.twoFactorEnabled}
            hasPassword={hasPassword}
            isDemo={process.env.DEMO_MODE === "true"}
          />
        </CardContent>
      </Card>

      {/* After the second factor, because both answer the same question — who
          can get in — and this one is the evidence for it. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sessions.title")}</CardTitle>
          <CardDescription>{t("sessions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveSessions />
        </CardContent>
      </Card>
    </div>
  )
}
