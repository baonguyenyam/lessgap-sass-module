import { getTranslations } from "next-intl/server"
import { Building2 } from "lucide-react"
import { requirePlatformRole } from "@/platform/staff"
import { AppShell } from "@/components/layout/app-shell/app-shell"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

/**
 * The platform console (task 1.10): staff-only, every page gated by
 * `requirePlatformRole` — signed out goes to /login, a member without a
 * `platformRole` goes to their dashboard (T10).
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformRole()
  const t = await getTranslations("platform")
  const tNav = await getTranslations("dashboard.nav")

  return (
    <AppShell
      area="platform"
      user={{ name: user.name, email: user.email, image: user.image }}
      showAdmin={false}
      breadcrumbs={{
        icon: <Building2 className="h-4 w-4" />,
        base: { name: t("badge"), href: "/platform" },
        labels: { tenants: tNav("tenants") },
      }}
    >
      {children}
    </AppShell>
  )
}
