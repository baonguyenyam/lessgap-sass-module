import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { acceptInvitation, declineInvitation } from "@/app/actions/invitations"
import { PendingButton } from "@/components/auth/pending-button"
import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { HOME } from "@/config/site"
import { getCurrentUser } from "@/lib/auth"
import { invitationIsFor } from "@/lib/invitations"
import { DASHBOARD } from "@/lib/tenant-paths"
import { findInvitation } from "@/platform/tenancy/invitations"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * Where an invitation email lands (task 1.8). Signed out, it says who invited
 * whom and asks to sign in or sign up with that address; the proxy keeps the
 * invitation in a cookie so `/dashboard` brings the person back here after.
 * Signed in with the invited address, it offers accept and decline.
 */
export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invitation = await findInvitation(id)
  if (!invitation) notFound()
  const t = await getTranslations("invite")
  const user = await getCurrentUser()
  const values = {
    tenant: invitation.tenant.name,
    inviter: invitation.inviter,
    email: invitation.email,
    role: invitation.role,
  }

  let body: React.ReactNode
  if (invitation.state !== "pending") {
    body = (
      <>
        <p className="text-sm text-muted-foreground">{t(`state.${invitation.state}`, values)}</p>
        <Button asChild variant="outline">
          <Link href={user ? DASHBOARD : HOME}>{t(user ? "toDashboard" : "toHome")}</Link>
        </Button>
      </>
    )
  } else if (!user) {
    body = (
      <>
        <p className="text-sm text-muted-foreground">{t("signedOut", values)}</p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/signup">{t("signUp")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </div>
      </>
    )
  } else if (!invitationIsFor(invitation.email, user.email)) {
    body = (
      <p className="text-sm text-muted-foreground">{t("wrongAccount", { ...values, current: user.email ?? "" })}</p>
    )
  } else {
    body = (
      <form className="flex flex-col gap-2">
        <input type="hidden" name="id" value={invitation.id} />
        <PendingButton formAction={acceptInvitation}>{t("accept")}</PendingButton>
        <PendingButton formAction={declineInvitation} variant="outline">
          {t("decline")}
        </PendingButton>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex justify-center">
        <LogoMark className="h-12 w-12 rounded-2xl ring-1 ring-primary/15" iconClassName="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title", values)}</h1>
        <p className="text-sm text-muted-foreground">{t("summary", values)}</p>
      </div>
      {body}
    </div>
  )
}
