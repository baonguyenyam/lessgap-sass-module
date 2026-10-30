import type { Route } from "next"
import { DASHBOARD, tenantPath } from "@/lib/tenant-paths"
import type { TenantPermission } from "@/platform/tenancy/permissions"
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  ClipboardList,
  Contact,
  CreditCard,
  Database,
  FileText,
  Gauge,
  Gift,
  Globe,
  Globe2,
  HardDrive,
  Hourglass,
  KeyRound,
  Languages,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Package,
  Shield,
  SlidersHorizontal,
  Star,
  Ticket,
  TriangleAlert,
  UserCog,
  UserRound,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react"

/**
 * The navigation of the app areas, in one place: the sidebar, the search
 * dialog and the mobile sheet all read it. Labels are keys under
 * `dashboard.nav`; group labels under `dashboard.nav.groups`.
 *
 * A dashboard item names the module that owns its page and the permission
 * its page checks (`requireModule` / `requireTenantContext` there), so the
 * menu never offers a page that would turn the member away.
 */
export type NavItem = {
  key: string
  href: Route
  icon: LucideIcon
  exact?: boolean
  /** The module the page belongs to: hidden while the tenant has it off. */
  module?: string
  /** The permission the page requires: hidden from a member without it. */
  permission?: TenantPermission
  children?: NavItem[]
}
export type NavGroup = { key: string; items: NavItem[] }
export type NavArea = "dashboard" | "admin" | "platform"

/**
 * What the viewer may see. `slug` is the tenant the dashboard shows (task
 * 1.7). `enabledModules` and `permissions` filter the dashboard items when
 * given; left out, nothing is filtered on that axis. `customRoles` is the
 * tenant's `roles.custom` feature (task 1.8b); `showPlatform` is staff with
 * a platform role.
 */
export type NavAccess = {
  showAdmin: boolean
  showPlatform?: boolean
  slug: string
  customRoles?: boolean
  enabledModules?: readonly string[]
  permissions?: readonly string[]
}

const BACK: NavGroup = {
  key: "back",
  items: [{ key: "backToDashboard", href: DASHBOARD, icon: ArrowLeft, exact: true }],
}

export function navGroups(area: NavArea, access: NavAccess): NavGroup[] {
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
      BACK,
    ]
  }
  if (area === "platform") {
    // Every console page has the same gate (`requirePlatformRole`), so the
    // console lists them all.
    return [
      {
        key: "platform",
        items: [
          { key: "overview", href: "/platform", icon: LayoutGrid, exact: true },
          { key: "tenants", href: "/platform/tenants", icon: Building2 },
          { key: "plans", href: "/platform/plans", icon: CreditCard },
          { key: "modules", href: "/platform/modules", icon: Boxes },
          { key: "usage", href: "/platform/usage", icon: Gauge },
          { key: "domains", href: "/platform/domains", icon: Globe2 },
        ],
      },
      {
        key: "operationsPlatform",
        items: [
          { key: "jobs", href: "/platform/jobs", icon: ListChecks },
          {
            key: "emails",
            href: "/platform/emails",
            icon: Mail,
            children: [
              { key: "emailLog", href: "/platform/emails", icon: Mail, exact: true },
              { key: "emailTemplates", href: "/platform/emails/templates", icon: FileText },
            ],
          },
          { key: "errors", href: "/platform/errors", icon: TriangleAlert },
          { key: "backups", href: "/platform/backups", icon: Database },
          { key: "settings", href: "/platform/settings", icon: SlidersHorizontal },
        ],
      },
      BACK,
    ]
  }

  const t = (page = "") => tenantPath(access.slug, page)
  const groups: NavGroup[] = [
    {
      key: "main",
      items: [{ key: "dashboard", href: t(), icon: LayoutGrid, exact: true }],
    },
    {
      // The day-to-day work: the calendar and what it produces, then sales.
      key: "operations",
      items: [
        { key: "calendar", href: t("calendar"), icon: Calendar, module: "booking", permission: "bookings.view" },
        {
          key: "reservations",
          href: t("reservations"),
          icon: Utensils,
          module: "reservations",
          permission: "bookings.view",
        },
        { key: "waitlist", href: t("waitlist"), icon: Hourglass, module: "booking", permission: "bookings.manage" },
        { key: "reviews", href: t("reviews"), icon: Star, module: "booking", permission: "bookings.view" },
        { key: "customers", href: t("customers"), icon: Users, module: "customers", permission: "customers.view" },
        {
          key: "orders",
          href: t("orders"),
          icon: Package,
          module: "shop",
          permission: "orders.view",
          children: [
            {
              key: "orderList",
              href: t("orders"),
              icon: Package,
              exact: true,
              module: "shop",
              permission: "orders.view",
            },
            {
              key: "orderBoard",
              href: t("orders/board"),
              icon: ClipboardList,
              module: "ordering",
              permission: "orders.view",
            },
          ],
        },
        { key: "quotes", href: t("quotes"), icon: FileText, module: "quotes", permission: "quotes.view" },
        { key: "sales", href: t("sales"), icon: Gift, module: "booking", permission: "bookings.manage" },
        { key: "payments", href: t("payments"), icon: CreditCard, module: "payments", permission: "billing.manage" },
      ],
    },
    {
      // What the business offers and how the site presents it.
      key: "content",
      items: [
        { key: "catalog", href: t("catalog"), icon: List, module: "catalog", permission: "catalog.manage" },
        { key: "products", href: t("products"), icon: Ticket, module: "booking", permission: "bookings.manage" },
        { key: "team", href: t("team"), icon: Contact, module: "team", permission: "team.manage" },
        { key: "locations", href: t("locations"), icon: MapPin, module: "booking", permission: "bookings.manage" },
        { key: "intake", href: t("intake"), icon: ClipboardList, module: "booking", permission: "bookings.manage" },
        { key: "newsletter", href: t("newsletter"), icon: Mail, module: "newsletter", permission: "newsletter.view" },
        { key: "chatbot", href: t("chatbot"), icon: MessageCircle, module: "chatbot", permission: "settings.manage" },
        { key: "analytics", href: t("analytics"), icon: BarChart3, module: "analytics", permission: "settings.manage" },
      ],
    },
    {
      key: "workspace",
      items: [
        { key: "members", href: t("members"), icon: UserCog, permission: "members.view" },
        ...(access.customRoles === false
          ? []
          : [{ key: "roles", href: t("roles"), icon: KeyRound, permission: "roles.view" } satisfies NavItem]),
        { key: "billing", href: t("billing"), icon: CreditCard, permission: "billing.manage" },
        {
          key: "settings",
          href: t("settings"),
          icon: SlidersHorizontal,
          children: [
            { key: "general", href: t("settings"), icon: SlidersHorizontal, exact: true },
            { key: "site", href: t("settings/site"), icon: Globe, permission: "settings.manage" },
            { key: "domains", href: t("settings/domains"), icon: Globe2, permission: "settings.manage" },
            { key: "modules", href: t("settings/modules"), icon: Boxes, permission: "settings.manage" },
            {
              key: "paymentsSettings",
              href: t("settings/payments"),
              icon: CreditCard,
              module: "payments",
              permission: "settings.manage",
            },
            { key: "localization", href: t("settings/localization"), icon: Languages },
            { key: "display", href: t("settings/display"), icon: Monitor },
          ],
        },
      ],
    },
    {
      key: "account",
      items: [
        { key: "account", href: "/dashboard/account", icon: UserRound },
        ...(access.showPlatform
          ? [{ key: "platformConsole", href: "/platform", icon: Building2 } satisfies NavItem]
          : []),
        ...(access.showAdmin ? [{ key: "adminPanel", href: "/admin", icon: Shield } satisfies NavItem] : []),
      ],
    },
  ]
  return filterGroups(groups, access)
}

/** Whether `item` passes the viewer's modules and permissions. */
export function navItemAllowed(item: Pick<NavItem, "module" | "permission">, access: NavAccess): boolean {
  if (item.module && access.enabledModules && !access.enabledModules.includes(item.module)) return false
  if (item.permission && access.permissions && !access.permissions.includes(item.permission)) return false
  return true
}

/**
 * Drops what the viewer may not open, children included. A parent left with
 * no child stays only when its own page is open to the viewer.
 */
function filterGroups(groups: NavGroup[], access: NavAccess): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): NavItem[] => {
        const children = item.children?.filter((child) => navItemAllowed(child, access))
        if (children?.length) return [{ ...item, children }]
        return navItemAllowed(item, access) ? [{ ...item, children: undefined }] : []
      }),
    }))
    .filter((group) => group.items.length > 0)
}

/** Every page in `groups` once, a parent's children in its place, for search. */
export function flatNavItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items.flatMap((item) => item.children ?? [item]))
}

/** Whether `item` is the page at `pathname`: section roots match only themselves. */
export function isNavItemActive(item: Pick<NavItem, "href" | "exact">, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
