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
  SlidersHorizontal,
  UserCog,
  Menu,
  Settings,
  Shield,
  Users,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Keep in sync with the sidebar navItems in (dashboard)/layout.tsx and
// (admin)/layout.tsx — the sidebar is hidden below `md` and this menu
// takes over.
const menus = {
  dashboard: [
    { href: "/dashboard", key: "dashboard", icon: LayoutGrid },
    { href: "/dashboard/projects", key: "projects", icon: FolderKanban },
    { href: "/dashboard/members", key: "members", icon: Users },
    { href: "/dashboard/roles", key: "roles", icon: KeyRound },
    { href: "/dashboard/billing", key: "billing", icon: CreditCard },
    { href: "/dashboard/settings", key: "settings", icon: Settings },
  ],
  admin: [
    { href: "/admin", key: "overview", icon: LayoutGrid },
    { href: "/admin/users", key: "users", icon: UserCog },
    { href: "/admin/newsletter", key: "newsletter", icon: Mail },
    { href: "/admin/settings", key: "platformSettings", icon: SlidersHorizontal },
  ],
}

/** Hamburger nav for the app areas below `md`, where the sidebar is hidden. */
export function MobileNav({
  variant,
  showAdminLink = false,
}: {
  variant: keyof typeof menus
  showAdminLink?: boolean
}) {
  const t = useTranslations("dashboard.nav")
  const pathname = useRenderedPathname()
  const isActive = (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("openNavigation")}
          className="md:hidden"
        >
          <Menu size={24} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 md:hidden">
        {menus[variant].map(({ href, key, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href} className={isActive(href) ? "bg-primary/10 font-medium text-primary" : undefined}>
              <Icon />
              {t(key)}
            </Link>
          </DropdownMenuItem>
        ))}
        {variant === "dashboard" && showAdminLink && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {variant === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <ArrowLeft />
                Back to Dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
