import { cookies } from "next/headers"
import { HeaderBreadcrumbs } from "@/components/dashboard/header-breadcrumbs"
import { PoweredBy } from "@/components/powered-by"
import { SwitchAsBanner } from "@/components/switch-as-banner"
import { ThemeToggle } from "@/components/theme-toggle"
import { NavUser } from "@/components/layout/app-shell/nav-user"
import { NotificationBell } from "@/components/layout/app-shell/notification-bell"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-shell/app-sidebar"
import type { NavUserProps } from "@/components/layout/app-shell/nav-user"
import type { NavAccess, NavArea } from "@/components/layout/app-shell/nav"
import type { TenantOption } from "@/components/layout/app-shell/tenant-switcher"
import { SearchDialog } from "@/components/layout/app-shell/search-dialog"
import { LanguageSwitcher } from "@/components/layout/app-shell/language-switcher"
import { APP_LOCALES } from "@/platform/settings/registry"

/**
 * The frame of every signed-in page (spec/adr/0021, Studio Admin's layout):
 * the shadcn sidebar, a slim header with the trail, search, language and theme, and the
 * page. The sidebar remembers whether it was open in the `sidebar_state`
 * cookie, which the stock component writes.
 */
export async function AppShell({
  area,
  user,
  access,
  breadcrumbs,
  notifications,
  tenant = null,
  tenants = [],
  children,
}: {
  area: NavArea
  user: NavUserProps
  /** What the menu may offer this viewer (see `NavAccess`); the slug comes from `tenant`. */
  access: Omit<NavAccess, "slug">
  /** The tenant the dashboard area shows, and every tenant the person belongs to (task 1.7). */
  tenant?: TenantOption | null
  tenants?: TenantOption[]
  breadcrumbs: React.ComponentProps<typeof HeaderBreadcrumbs>
  /** Unread count + feed link for the header bell (dashboard area only). */
  notifications?: { unread: number; href: string; items?: { id: string; title: string; href: string | null }[] }
  children: React.ReactNode
}) {
  const nav: NavAccess = { ...access, slug: tenant?.slug ?? "" }
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar area={area} access={nav} tenant={tenant} tenants={tenants} />
      {/* min-w-0: a wide table scrolls inside its card instead of widening the page.
          md:border: the UI has no shadows, so the border sets the page apart from the sidebar.
          md:overflow-clip: rounds the sticky header's corners too; clip, not hidden, so sticky still works. */}
      <SidebarInset className="min-w-0 md:overflow-clip md:border md:border-border">
        <SwitchAsBanner email={user.email} />
        <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <HeaderBreadcrumbs {...breadcrumbs} />
          <div className="ml-auto flex items-center gap-2">
            <SearchDialog area={area} access={nav} />
            <LanguageSwitcher locales={APP_LOCALES} />
            <ThemeToggle />
            {notifications && (
              <NotificationBell unread={notifications.unread} href={notifications.href} items={notifications.items} />
            )}
            <NavUser {...user} variant="header" />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer className="flex items-center justify-center px-6 py-4">
          <PoweredBy />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
