import { getCurrentUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { Shield } from "lucide-react"
import { AppShell } from "@/components/layout/app-shell/app-shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const t = await getTranslations("admin")
  const tNav = await getTranslations("dashboard.nav")
  if (!user) redirect("/login")
  // The admin area is ROOT-only by owner decision: platform staff get the
  // /platform console in phase 1, the kit's ADMIN role keeps no panel here.
  if (!isRoot(user.role)) redirect("/dashboard")

  return (
    <AppShell
      area="admin"
      user={{ name: user.name, email: user.email, image: user.image }}
      showAdmin
      breadcrumbs={{
        icon: <Shield className="h-4 w-4" />,
        base: { name: t("badge"), href: "/admin" },
        labels: { users: tNav("users"), newsletter: tNav("newsletter"), settings: tNav("platformSettings") },
      }}
    >
      {children}
    </AppShell>
  )
}
