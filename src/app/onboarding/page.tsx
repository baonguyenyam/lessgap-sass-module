import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getCurrentUser } from "@/lib/auth"
import { getMembership } from "@/platform/tenancy/require-member"
import { verticalKeys, getVertical } from "@/verticals"
import { OnboardingWizard } from "@/components/onboarding/wizard"

/** The onboarding wizard (task 4.5, spec/06): a new tenant owner walks name →
 * vertical → slug → basics → theme and lands on their dashboard. Members of
 * an existing tenant skip it. */
export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const member = await getMembership(user.id)
  if (member) redirect("/dashboard")
  const t = await getTranslations("onboarding")
  const verticals = verticalKeys.map((k) => ({ key: k, label: getVertical(k).label }))

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("subtitle")}</p>
      <OnboardingWizard verticals={verticals} />
    </div>
  )
}
