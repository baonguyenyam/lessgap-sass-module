import { headers } from "next/headers"
import { requireUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { getTranslations } from "next-intl/server"
import { LayoutGrid } from "lucide-react"
import { AppShell } from "@/components/layout/app-shell/app-shell"
import { tenantPath } from "@/lib/tenant-paths"
import { toDate } from "@/lib/timestamps"
import { isModuleActive } from "@/platform/modules/runtime"
import { getEntitlements } from "@/platform/entitlements"
import { TENANT_SLUG_HEADER } from "@/platform/request-context"
import { ensureTenant, listMemberTenants } from "@/platform/tenancy/require-member"

// Cache Components adoption (spec/adr/0022): this segment may still block on
// request data. Remove the opt-out when the route is converted (steps 3 and 4).
export const instant = false

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const tNav = await getTranslations("dashboard.nav")
  const tAccount = await getTranslations("dashboard.account.nav")
  const tSettingsNav = await getTranslations("dashboard.settings.nav")
  // The tenant on screen: the one in the `/t/<slug>` path, else (account
  // pages) the one `/dashboard` would open. `t/[slug]/layout.tsx` checks the
  // membership; an unknown slug here only means no entry is marked current.
  const slug = (await headers()).get(TENANT_SLUG_HEADER) ?? (await ensureTenant(user)).tenant.slug
  const tenants = await listMemberTenants(user.id)
  const current = tenants.find((t) => t.slug === slug)
  const tenant = current ? { slug: current.slug, name: current.name } : { slug, name: slug }
  const entitlements = await getEntitlements({ tenantId: current?.id ?? "" })
  // Sidebar module gates (task 2.10): a module's items disappear when it is
  // disabled for the tenant, the same way its routes 404 (L2).
  const enabledModules = new Set<string>()
  if (
    current &&
    (await isModuleActive({ tenantId: current.id, actor: { kind: "member", userId: user.id, role: "" } }, "newsletter"))
  ) {
    enabledModules.add("newsletter")
  }

  const pastDueUntil = current?.status === "PAST_DUE" && current.graceUntil ? toDate(current.graceUntil) : null

  return (
    <>
      {pastDueUntil && (
        <div className="bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
          {tNav("pastDueBanner", { date: pastDueUntil.toLocaleDateString() })}
        </div>
      )}
      <AppShell
        area="dashboard"
        user={{ name: user.name, email: user.email, image: user.image }}
        showAdmin={isRoot(user.role)}
        tenant={tenant}
        tenants={tenants.map(({ slug, name }) => ({ slug, name }))}
        customRoles={entitlements.has("roles.custom")}
        enabledModules={enabledModules}
        breadcrumbs={{
          icon: <LayoutGrid className="h-4 w-4" />,
          base: { name: tNav("dashboard"), href: tenantPath(slug) },
          alsoUnder: "/dashboard",
          labels: {
            members: tNav("members"),
            newsletter: tNav("newsletter"),
            roles: tNav("roles"),
            billing: tNav("billing"),
            account: tNav("account"),
            settings: tNav("settings"),
            preferences: tAccount("preferences"),
            notifications: tAccount("notifications"),
            localization: tSettingsNav("localization"),
            display: tSettingsNav("display"),
            security: tAccount("security"),
            backup: tAccount("backup"),
            activity: tAccount("activity"),
          },
        }}
      >
        {children}
      </AppShell>
    </>
  )
}
