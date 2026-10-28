import type { Route } from "next"
import { DASHBOARD, tenantPath } from "@/lib/tenant-paths"
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Database,
  HardDrive,
  KeyRound,
  LayoutGrid,
  Mail,
  Shield,
  SlidersHorizontal,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * The navigation of the two app areas, in one place: the sidebar, the search
 * dialog and the mobile sheet all read it. Labels are keys under
 * `dashboard.nav`; group labels under `dashboard.nav.groups`.
 */
export type NavItem = { key: string; href: Route; icon: LucideIcon; exact?: boolean }
export type NavGroup = { key: string; items: NavItem[] }
export type NavArea = "dashboard" | "admin" | "platform"

/**
 * `slug` is the tenant the dashboard area is showing (task 1.7): its pages
 * live under `/t/<slug>`. Account pages are the person's, at `/dashboard/account`.
 * `customRoles` is the tenant's `roles.custom` feature (task 1.8b): without it
 * the roles page does not exist, so neither does its entry.
 */
export function navGroups(
  area: NavArea,
  { showAdmin, slug, customRoles = true }: { showAdmin: boolean; slug: string; customRoles?: boolean }
): NavGroup[] {
  const t = (page = "") => tenantPath(slug, page)
  if (area === "admin") {
    return [
      {
        key: "admin",
        items: [
          { key: "overview", href: "/admin", icon: LayoutGrid, exact: true },
          { key: "users", href: "/admin/users", icon: UserCog },
          { key: "newsletter", href: "/admin/newsletter", icon: Mail },
          { key: "databaseMigrations", href: "/admin/database/migrations", icon: HardDrive },
          { key: "databaseBackups", href: "/admin/database/backups", icon: Database },
          { key: "platformSettings", href: "/admin/settings", icon: SlidersHorizontal },
        ],
      },
      { key: "back", items: [{ key: "backToDashboard", href: DASHBOARD, icon: ArrowLeft, exact: true }] },
    ]
  }
  if (area === "platform") {
    return [
      {
        key: "platform",
        items: [{ key: "tenants", href: "/platform/tenants", icon: Building2 }],
      },
      { key: "back", items: [{ key: "backToDashboard", href: DASHBOARD, icon: ArrowLeft, exact: true }] },
    ]
  }
  return [
    {
      key: "main",
      items: [{ key: "dashboard", href: t(), icon: LayoutGrid, exact: true }],
    },
    {
      key: "workspace",
      items: [
        { key: "members", href: t("members"), icon: Users },
        { key: "newsletter", href: t("newsletter"), icon: Mail },
        ...(customRoles ? [{ key: "roles", href: t("roles"), icon: KeyRound } satisfies NavItem] : []),
      ],
    },
    {
      key: "account",
      items: [
        { key: "billing", href: t("billing"), icon: CreditCard },
        { key: "account", href: "/dashboard/account", icon: UserRound },
        { key: "settings", href: t("settings"), icon: SlidersHorizontal },
        ...(showAdmin ? [{ key: "adminPanel", href: "/admin", icon: Shield } satisfies NavItem] : []),
      ],
    },
  ]
}

/** Whether `item` is the page at `pathname`: section roots match only themselves. */
export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
