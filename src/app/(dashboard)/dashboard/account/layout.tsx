import { Activity, Bell, DatabaseBackup, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { SectionLayout, SectionNav } from "@/components/layout/section-nav"
import { ProfileHero } from "@/components/settings/profile-hero"
import { requireUser } from "@/lib/auth"
import { ACCOUNT_BASE, ACCOUNT_PAGES, type AccountPageKey } from "@/lib/settings-pages"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

const ICONS: Record<AccountPageKey, React.ReactNode> = {
  profile: <UserRound />,
  preferences: <SlidersHorizontal />,
  notifications: <Bell />,
  security: <ShieldCheck />,
  activity: <Activity />,
  backup: <DatabaseBackup />,
}

/**
 * Every account page (platform.madelab.io's profile layout): who the account
 * is on top, the grouped menu on the left, the page on the right.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const t = await getTranslations("dashboard.account")
  const items = ACCOUNT_PAGES.map((page) => ({
    href: page.href,
    label: t(`nav.${page.key}`),
    segment: page.href.slice(ACCOUNT_BASE.length + 1) || null,
    icon: ICONS[page.key],
    group: t(`groups.${page.group}`),
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProfileHero userId={user.id} />
      <SectionLayout nav={<SectionNav items={items} label={t("nav.label")} />}>{children}</SectionLayout>
    </div>
  )
}
