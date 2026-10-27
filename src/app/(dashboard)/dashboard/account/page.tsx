import { requireUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { db8 } from "@/lib/db8"
import { toDate } from "@/lib/timestamps"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { DeleteAccount } from "@/components/dashboard/delete-account"
import { SettingsMessage } from "@/components/settings/settings-message"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
}

/** Settings → General: the profile, the account facts and the danger zone. */
export default async function GeneralSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const currentUser = await requireUser()
  const t = await getTranslations("dashboard.settings")
  const format = await getFormatter()

  const user = await db8.orm.public.User.select("name", "email", "image", "createdAt")
    .include("accounts", (a) => a.select("providerId"))
    .where({ id: currentUser.id })
    .first()
  if (!user) redirect("/login")

  // The photo, when there is one, came from the provider the account was
  // created with. First linked one is the best guess the schema allows: the
  // adapter does not record which account supplied the image. Skipping the
  // credential row matters: the password is an Account too, and it cannot
  // have supplied a photo.
  const firstOAuth = user.accounts.find((a) => a.providerId !== "credential")
  const avatarProvider = firstOAuth ? PROVIDER_LABELS[firstOAuth.providerId] : undefined

  return (
    <div className="space-y-6">
      <SettingsMessage searchParams={searchParams} />

      <Card>
        <CardHeader>
          <CardTitle>{t("profileTitle")}</CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} image={user.image} avatarProvider={avatarProvider} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("accountTitle")}</CardTitle>
          <CardDescription>{t("accountDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("memberSince")}</span>
            <span className="font-medium">
              {format.dateTime(toDate(user.createdAt), {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Same shape as the danger zone on a project: its own card with a
          destructive title, rather than a box nested inside another section. */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("dangerZone.title")}</CardTitle>
          <CardDescription>{t("dangerZone.blurb")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-prose">
            <p className="text-sm font-medium text-foreground">{t("deleteAccount.heading")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("deleteAccount.blurb")}</p>
          </div>
          <DeleteAccount email={user.email} />
        </CardContent>
      </Card>
    </div>
  )
}
