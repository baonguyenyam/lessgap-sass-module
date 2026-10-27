"use client"

import { useTranslations } from "next-intl"

import Link from "next/link"
import { useRenderedPathname } from "@/hooks/use-rendered-pathname"
import {
  ArrowLeft,
  CreditCard,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  Mail,
  Settings,
  SlidersHorizontal,
  UserCog,
  Shield,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Keep in sync with mobile-nav.tsx — same sections, rendered as the `md`+
// sidebar. Client component so the current route can stay highlighted.
const menus = {
  dashboard: [
    // `exact`: section roots match only themselves, otherwise "Dashboard"
    // would light up on every sub-page too.
    { href: "/dashboard", key: "dashboard", icon: LayoutGrid, exact: true },
    { href: "/dashboard/projects", key: "projects", icon: FolderKanban },
    { href: "/dashboard/members", key: "members", icon: Users },
    { href: "/dashboard/roles", key: "roles", icon: KeyRound },
    { href: "/dashboard/billing", key: "billing", icon: CreditCard },
    { href: "/dashboard/settings", key: "settings", icon: Settings },
  ],
  admin: [
    { href: "/admin", key: "overview", icon: LayoutGrid, exact: true },
    { href: "/admin/users", key: "users", icon: UserCog },
    { href: "/admin/newsletter", key: "newsletter", icon: Mail },
    { href: "/admin/settings", key: "platformSettings", icon: SlidersHorizontal },
  ],
}

function linkClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors sidebar-collapsed:justify-center sidebar-collapsed:px-2",
    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )
}

// Hidden while the sidebar is collapsed to icons; the link keeps a `title`
// so the label survives as a tooltip.
function NavLabel({ children }: { children: React.ReactNode }) {
  return <span className="sidebar-collapsed:hidden">{children}</span>
}

export function SidebarNav({
  variant,
  showAdminLink = false,
}: {
  variant: keyof typeof menus
  showAdminLink?: boolean
}) {
  const t = useTranslations("dashboard.nav")
  // Rendered route, not the URL: `usePathname` goes stale after server-action
  // redirects, which is what this hook exists to avoid.
  const pathname = useRenderedPathname()
  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menus[variant].map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.key)}
              // Which entry is current was visible and not announced: the
              // styling said it and nothing else did, so anyone not looking at
              // the colours had no way to know where they were.
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <NavLabel>{t(item.key)}</NavLabel>
            </Link>
          )
        })}
        {variant === "admin" && (
          <div className="mt-4 border-t border-border pt-4">
            <Link href="/dashboard" title={t("backToDashboard")} className={linkClass(false)}>
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <NavLabel>{t("backToDashboard")}</NavLabel>
            </Link>
          </div>
        )}
      </nav>
      {/* The Admin Panel sits at the bottom of the sidebar, under a rule,
          apart from the entries you use every day: it is another place, not
          one more section of this one. */}
      {variant === "dashboard" && showAdminLink && (
        <nav aria-label={t("more")} className="space-y-1 border-t border-border p-3">
          <Link href="/admin" title={t("adminPanel")} className={linkClass(false)}>
            <Shield className="h-4 w-4 shrink-0" />
            <NavLabel>{t("adminPanel")}</NavLabel>
          </Link>
        </nav>
      )}
    </>
  )
}
