import {
  ArrowLeft,
  CreditCard,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  Mail,
  Settings,
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
export type NavItem = { key: string; href: string; icon: LucideIcon; exact?: boolean }
export type NavGroup = { key: string; items: NavItem[] }
export type NavArea = "dashboard" | "admin"

export function navGroups(area: NavArea, { showAdmin }: { showAdmin: boolean }): NavGroup[] {
  if (area === "admin") {
    return [
      {
        key: "admin",
        items: [
          { key: "overview", href: "/admin", icon: LayoutGrid, exact: true },
          { key: "users", href: "/admin/users", icon: UserCog },
          { key: "newsletter", href: "/admin/newsletter", icon: Mail },
          { key: "platformSettings", href: "/admin/settings", icon: SlidersHorizontal },
        ],
      },
      { key: "back", items: [{ key: "backToDashboard", href: "/dashboard", icon: ArrowLeft, exact: true }] },
    ]
  }
  return [
    {
      key: "main",
      items: [
        { key: "dashboard", href: "/dashboard", icon: LayoutGrid, exact: true },
        { key: "projects", href: "/dashboard/projects", icon: FolderKanban },
      ],
    },
    {
      key: "workspace",
      items: [
        { key: "members", href: "/dashboard/members", icon: Users },
        { key: "newsletter", href: "/dashboard/newsletter", icon: Mail },
        { key: "roles", href: "/dashboard/roles", icon: KeyRound },
      ],
    },
    {
      key: "account",
      items: [
        { key: "billing", href: "/dashboard/billing", icon: CreditCard },
        { key: "account", href: "/dashboard/account", icon: UserRound },
        { key: "settings", href: "/dashboard/settings", icon: Settings },
        ...(showAdmin ? [{ key: "adminPanel", href: "/admin", icon: Shield }] : []),
      ],
    },
  ]
}

/** Whether `item` is the page at `pathname`: section roots match only themselves. */
export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
