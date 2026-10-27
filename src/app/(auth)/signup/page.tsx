import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { registerUser } from "@/app/actions/auth"
import { LogoMark } from "@/components/logo"
import { PendingButton } from "@/components/auth/pending-button"
import { AuthNotice } from "@/components/auth/auth-notice"
import { Input } from "@/components/ui/input"
import { siteConfig } from "@/config/site"
import { emailEnabled } from "@/lib/email-transport"
import { getPlatformSettings } from "@/platform/settings/store"

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const t = await getTranslations("auth.signup")
  // An unknown code must not throw: the query string is user controlled, so a
  // key that does not exist falls back to the generic message.
  const errorMessage = error ? (t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.generic")) : null

  // On the public demo the page stays visible as a showcase, but the form is
  // disabled: the demo has no email service attached and runs on shared
  // fixture accounts.
  const isDemo = process.env.DEMO_MODE === "true"
  // Marketing deployments delegate auth to the demo deployment.
  if (!isDemo && siteConfig.links.demo) redirect(siteConfig.links.demo)

  const hasEmailService = emailEnabled()
  // Closed by ROOT in the platform settings: the page stays, the form does not work.
  const closed = !(await getPlatformSettings())["signup.enabled"]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-[var(--shadow-soft-lg)] backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <LogoMark className="h-12 w-12 rounded-2xl ring-1 ring-primary/15" iconClassName="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasEmailService ? t("subtitleVerified") : t("subtitlePassword")}
          </p>
        </div>

        {isDemo && (
          <AuthNotice>
            {t("demoNotice")}{" "}
            {t.rich("demoNoticeExtra", {
              resend: (chunks) => (
                <a href="https://resend.com" className="underline underline-offset-2" target="_blank" rel="noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </AuthNotice>
        )}
        {closed && <AuthNotice>{t("closedNotice")}</AuthNotice>}
        {!isDemo && !closed && !hasEmailService && (
          <AuthNotice>
            {t.rich("noEmailService", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </AuthNotice>
        )}

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <form action={registerUser} className="flex flex-col gap-3">
          <Input
            name="name"
            type="text"
            placeholder={t("namePlaceholder")}
            autoComplete="name"
            maxLength={100}
            disabled={isDemo || closed}
            size="lg"
          />
          <Input
            name="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            required
            disabled={isDemo || closed}
            size="lg"
          />
          <Input
            name="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            disabled={isDemo || closed}
            size="lg"
          />
          <PendingButton disabled={isDemo || closed} variant="primary" size="lg" className="w-full">
            {t("submit")}
          </PendingButton>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t.rich("haveAccount", {
            signin: (chunks) => (
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t.rich("legal", {
            terms: (chunks) => (
              <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  )
}
