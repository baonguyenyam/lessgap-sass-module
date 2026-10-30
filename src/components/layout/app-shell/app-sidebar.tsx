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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronRight } from "lucide-react"
import { siteConfig } from "@/config/site"
import { isNavItemActive, navGroups, type NavAccess, type NavArea } from "@/components/layout/app-shell/nav"
import { tenantPath } from "@/lib/tenant-paths"
import { TenantSwitcher, type TenantOption } from "@/components/layout/app-shell/tenant-switcher"

/**
 * The app sidebar (spec/adr/0021, from Studio Admin): collapses to icons on
 * desktop, opens as a sheet on a phone; the signed-in user sits in the
 * header.
 */
export function AppSidebar({
  area,
  access,
  tenant,
  tenants,
}: {
  area: NavArea
  access: NavAccess
  /** The tenant the dashboard area shows; null in the admin area. */
  tenant: TenantOption | null
  tenants: TenantOption[]
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
        {navGroups(area, access).map((group) => (
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

      {/* © year + site name, from configuration — hidden when the sidebar
          collapses to icons (owner's sidebar-footer requirement). */}
      <SidebarFooter className="px-4 py-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </SidebarFooter>

      {/* Still folds the sidebar on click, without drawing a line on hover. */}
      <SidebarRail className="hover:after:bg-transparent" />
    </Sidebar>
  )
}
