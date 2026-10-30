"use client"

import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { tenantPath } from "@/lib/tenant-paths"

export type TenantOption = { slug: string; name: string }

/**
 * Which tenant the dashboard shows, and the way to another one (task 1.7).
 * Each entry is a plain link to `/t/<slug>`: the tenant layout checks the
 * membership and the proxy remembers the choice for `/dashboard`. A person
 * with one tenant sees its name and no menu.
 */
export function TenantSwitcher({ current, tenants }: { current: TenantOption; tenants: TenantOption[] }) {
  const t = useTranslations("dashboard.nav")
  const label = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
        aria-hidden="true"
      >
        {current.name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">{current.name}</span>
        <span className="truncate text-xs text-muted-foreground">{t("groups.workspace")}</span>
      </span>
    </>
  )

  if (tenants.length <= 1) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link href={tenantPath(current.slug)}>{label}</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label={t("switchWorkspace")}>
              {label}
              <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t("switchWorkspace")}</DropdownMenuLabel>
            {tenants.map((tenant) => (
              <DropdownMenuItem key={tenant.slug} asChild>
                <Link href={tenantPath(tenant.slug)} aria-current={tenant.slug === current.slug ? "page" : undefined}>
                  <span className="truncate">{tenant.name}</span>
                  {tenant.slug === current.slug && <Check className="ml-auto" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/onboarding">
                <Plus className="mr-1 size-4" />
                <span className="text-muted-foreground">{t("addTeam")}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
