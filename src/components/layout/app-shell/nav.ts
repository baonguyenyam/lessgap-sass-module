import type { Route } from "next"
import { DASHBOARD, tenantPath } from "@/lib/tenant-paths"
import {
  Boxes,
  Calendar,
  Star,
  Gift,
  MapPin,
  Globe,
  List,
  Globe2,
  ArrowLeft,
  Building2,
  CreditCard,
  Database,
  HardDrive,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Mail,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
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
  {
    showAdmin,
    slug,
    customRoles = true,
    enabledModules,
  }: { showAdmin: boolean; slug: string; customRoles?: boolean; enabledModules?: ReadonlySet<string> }
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
        items: [
          { key: "tenants", href: "/platform/tenants", icon: Building2 },
          { key: "plans", href: "/platform/plans", icon: CreditCard },
          { key: "modules", href: "/platform/modules", icon: Boxes },
          { key: "jobs", href: "/platform/jobs", icon: ListChecks },
          { key: "emails", href: "/platform/emails", icon: Mail },
          { key: "errors", href: "/platform/errors", icon: TriangleAlert },
          { key: "settings", href: "/platform/settings", icon: SlidersHorizontal },
        ],
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
      key: "operations",
      items: [
        // The day-to-day work — the calendar's bookings, the reviews the
        // visits leave, the till's sales and the customers it serves
        // (shopify-style: operate first, sell/content second).
        ...(enabledModules && !enabledModules.has("booking")
          ? []
          : [{ key: "calendar", href: t("calendar"), icon: Calendar } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("booking")
          ? []
          : [{ key: "reviews", href: t("reviews"), icon: Star } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("booking")
          ? []
          : [{ key: "sales", href: t("sales"), icon: Gift } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("customers")
          ? []
          : [{ key: "customers", href: t("customers"), icon: Users } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("reservations")
          ? []
          : [{ key: "reservations", href: t("reservations"), icon: Boxes } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("shop")
          ? []
          : [{ key: "orders", href: t("orders"), icon: Boxes } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("quotes")
          ? []
          : [{ key: "quotes", href: t("quotes"), icon: ListChecks } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("payments")
          ? []
          : [{ key: "payments", href: t("payments"), icon: CreditCard } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("booking")
          ? []
          : [{ key: "locations", href: t("locations"), icon: MapPin } satisfies NavItem]),
      ],
    },
    {
      key: "content",
      items: [
        // The site's content — the catalogue, the team, the newsletter, the
        // chatbot and its analytics.
        ...(enabledModules && !enabledModules.has("catalog")
          ? []
          : [{ key: "catalog", href: t("catalog"), icon: List } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("team")
          ? []
          : [{ key: "team", href: t("team"), icon: Users } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("newsletter")
          ? []
          : [{ key: "newsletter", href: t("newsletter"), icon: Mail } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("chatbot")
          ? []
          : [{ key: "chatbot", href: t("chatbot"), icon: Boxes } satisfies NavItem]),
        ...(enabledModules && !enabledModules.has("analytics")
          ? []
          : [{ key: "analytics", href: t("analytics"), icon: Boxes } satisfies NavItem]),
      ],
    },
    {
      key: "workspace",
      items: [
        { key: "members", href: t("members"), icon: Users },
        ...(customRoles ? [{ key: "roles", href: t("roles"), icon: KeyRound } satisfies NavItem] : []),
      ],
    },
    {
      key: "account",
      items: [
        { key: "billing", href: t("billing"), icon: CreditCard },
        { key: "account", href: "/dashboard/account", icon: UserRound },
        { key: "settings", href: t("settings"), icon: SlidersHorizontal },
        { key: "site", href: `${t("settings")}/site` as Route, icon: Globe },
        { key: "domains", href: `${t("settings")}/domains` as Route, icon: Globe2 },
        ...(showAdmin ? [{ key: "adminPanel", href: "/admin", icon: Shield } satisfies NavItem] : []),
      ],
    },
  ]
}

/** Whether `item` is the page at `pathname`: section roots match only themselves. */
export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
