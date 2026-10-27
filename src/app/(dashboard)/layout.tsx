import { requireUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { getTranslations } from "next-intl/server"
import { LayoutGrid } from "lucide-react"
import { AppShell } from "@/components/layout/app-shell/app-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const tNav = await getTranslations("dashboard.nav")
  const tSettings = await getTranslations("dashboard.settings.nav")

  return (
    <AppShell
      area="dashboard"
      user={{ name: user.name, email: user.email, image: user.image }}
      showAdmin={isRoot(user.role)}
      breadcrumbs={{
        icon: <LayoutGrid className="h-4 w-4" />,
        base: { name: tNav("dashboard"), href: "/dashboard" },
        labels: {
          projects: tNav("projects"),
          members: tNav("members"),
          roles: tNav("roles"),
          billing: tNav("billing"),
          settings: tNav("settings"),
          security: tSettings("security"),
          backup: tSettings("backup"),
          logs: tSettings("logs"),
        },
      }}
    >
      {children}
    </AppShell>
  )
}
