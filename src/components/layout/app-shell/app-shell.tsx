import { cookies } from "next/headers"
import { HeaderBreadcrumbs } from "@/components/dashboard/header-breadcrumbs"
import { PoweredBy } from "@/components/powered-by"
import { SwitchAsBanner } from "@/components/switch-as-banner"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-shell/app-sidebar"
import type { NavUserProps } from "@/components/layout/app-shell/nav-user"
import type { NavArea } from "@/components/layout/app-shell/nav"
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
  showAdmin,
  breadcrumbs,
  children,
}: {
  area: NavArea
  user: NavUserProps
  showAdmin: boolean
  breadcrumbs: React.ComponentProps<typeof HeaderBreadcrumbs>
  children: React.ReactNode
}) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar area={area} showAdmin={showAdmin} user={user} />
      {/* min-w-0: a wide table scrolls inside its card instead of widening the page.
          md:border: the UI has no shadows, so the border sets the page apart from the sidebar.
          md:overflow-clip: rounds the sticky header's corners too; clip, not hidden, so sticky still works. */}
      <SidebarInset className="min-w-0 md:overflow-clip md:border">
        <SwitchAsBanner email={user.email} />
        <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <HeaderBreadcrumbs {...breadcrumbs} />
          <div className="ml-auto flex items-center gap-2">
            <SearchDialog area={area} showAdmin={showAdmin} />
            <LanguageSwitcher locales={APP_LOCALES} />
            <ThemeToggle />
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
