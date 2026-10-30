import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { requireUser } from "@/lib/auth"
import { isRoot } from "@/lib/roles"
import { getTranslations } from "next-intl/server"
import { LayoutGrid } from "lucide-react"
import { AppShell } from "@/components/layout/app-shell/app-shell"
import { tenantPath } from "@/lib/tenant-paths"
import { toDate } from "@/lib/timestamps"
import { isModuleActive } from "@/platform/modules/runtime"
import { unreadMemberNotifications } from "@/platform/notify/member"
import { getEntitlements } from "@/platform/entitlements"
import { TENANT_SLUG_HEADER } from "@/platform/request-context"
import { ensureTenant, getMembership, listMemberTenants } from "@/platform/tenancy/require-member"
import { grantedPermissions } from "@/platform/tenancy/permissions"
import { hasPlatformRole } from "@/platform/staff"

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
  // A user with no tenant goes through the onboarding wizard first (task
  // 4.5); `ensureTenant` still covers the staff-created and legacy paths.
  const existing = await getMembership(user.id)
  if (!existing) redirect("/onboarding")
  const slug = (await headers()).get(TENANT_SLUG_HEADER) ?? (await ensureTenant(user)).tenant.slug
  const tenants = await listMemberTenants(user.id)
  const current = tenants.find((t) => t.slug === slug)
  const tenant = current ? { slug: current.slug, name: current.name } : { slug, name: slug }
  const entitlements = await getEntitlements({ tenantId: current?.id ?? "" })
  // Sidebar module gates (task 2.10): a module's items disappear when it is
  // disabled for the tenant, the same way its routes 404 (L2).
  const enabledModules = new Set<string>()
  const navModuleKeys = [
    "newsletter",
    "catalog",
    "team",
    "booking",
    "customers",
    "reservations",
    "shop",
    "quotes",
    "payments",
    "chatbot",
    "analytics",
    "ordering",
  ]
  if (current) {
    for (const key of navModuleKeys) {
      if (await isModuleActive({ tenantId: current.id, actor: { kind: "member", userId: user.id, role: "" } }, key)) {
        enabledModules.add(key)
      }
    }
  }

  // The member's permissions in this tenant (one read for a custom role): the
  // menu shows only the pages that would let them in. Not a member (a slug
  // the proxy will 404) → nothing beyond the ungated entries.
  const role =
    current && existing.organizationId === current.id && existing.status !== "suspended" ? existing.role : null
  const permissions = current && role ? await grantedPermissions(current.id, role) : []

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
        access={{
          showAdmin: isRoot(user.role),
          showPlatform: await hasPlatformRole(user.id),
          customRoles: entitlements.has("roles.custom"),
          enabledModules: [...enabledModules],
          permissions,
        }}
        tenant={tenant}
        notifications={
          current
            ? {
                unread: (await unreadMemberNotifications(current.id, user.id)).length,
                href: `/t/${slug}/notifications`,
              }
            : undefined
        }
        tenants={tenants.map(({ slug, name }) => ({ slug, name }))}
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
