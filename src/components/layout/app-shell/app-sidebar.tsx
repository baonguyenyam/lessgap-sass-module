"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Logo } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronRight } from "lucide-react"
import type { NavUserProps } from "@/components/layout/app-shell/nav-user"
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
                  if (item.children?.length) {
                    return (
                      <Collapsible key={item.href} asChild defaultOpen={active} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={active} tooltip={t(item.key)}>
                              <Icon />
                              <span>{t(item.key)}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => {
                                const childActive = isNavItemActive(child, pathname)
                                return (
                                  <SidebarMenuSubItem key={child.href}>
                                    <SidebarMenuSubButton asChild isActive={childActive}>
                                      <Link href={child.href} aria-current={childActive ? "page" : undefined}>
                                        <span>{t(child.key)}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }
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

      {/* Still folds the sidebar on click, without drawing a line on hover. */}
      <SidebarRail className="hover:after:bg-transparent" />
    </Sidebar>
  )
}
