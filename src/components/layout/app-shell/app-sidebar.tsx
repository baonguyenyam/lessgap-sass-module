"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Logo } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser, type NavUserProps } from "@/components/layout/app-shell/nav-user"
import { isNavItemActive, navGroups, type NavArea } from "@/components/layout/app-shell/nav"
import { tenantPath } from "@/lib/tenant-paths"
import { TenantSwitcher, type TenantOption } from "@/components/layout/app-shell/tenant-switcher"

/**
 * The app sidebar (spec/adr/0021, from Studio Admin): collapses to icons on
 * desktop, opens as a sheet on a phone, and keeps the signed-in user at the
 * bottom.
 */
export function AppSidebar({
  area,
  showAdmin,
  user,
  tenant,
  tenants,
  customRoles,
  enabledModules,
}: {
  area: NavArea
  showAdmin: boolean
  user: NavUserProps
  /** The tenant the dashboard area shows; null in the admin area. */
  tenant: TenantOption | null
  tenants: TenantOption[]
  customRoles: boolean
  enabledModules?: ReadonlySet<string>
}) {
  const t = useTranslations("dashboard.nav")
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link
                href={
                  area === "admin"
                    ? "/admin"
                    : area === "platform"
                      ? "/platform"
                      : tenant
                        ? tenantPath(tenant.slug)
                        : "/dashboard"
                }
              >
                <Logo animated wordmarkClassName="group-data-[collapsible=icon]:hidden" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {area === "dashboard" && tenant && <TenantSwitcher current={tenant} tenants={tenants} />}
      </SidebarHeader>
      <SidebarContent>
        {navGroups(area, { showAdmin, slug: tenant?.slug ?? "", customRoles, enabledModules }).map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel>{t(`groups.${group.key}`)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isNavItemActive(item, pathname)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={t(item.key)}>
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <Icon />
                          <span>{t(item.key)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser {...user} />
      </SidebarFooter>
      {/* Still folds the sidebar on click, without drawing a line on hover. */}
      <SidebarRail className="hover:after:bg-transparent" />
    </Sidebar>
  )
}
