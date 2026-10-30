"use client"

import { CreditCard, EllipsisVertical, LogOut, Settings, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { SignOutDialog } from "@/components/dashboard/sign-out-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

export type NavUserProps = { name?: string | null; email?: string | null; image?: string | null }

/** The signed-in user at the foot of the sidebar, with the account menu (from Studio Admin). */
export function NavUser({
  name,
  email,
  image,
  variant = "sidebar",
}: NavUserProps & { variant?: "sidebar" | "header" }) {
  const t = useTranslations("dashboard.userMenu")
  const tNav = useTranslations("dashboard.nav")
  const { isMobile } = useSidebar()
  const [signOutOpen, setSignOutOpen] = useState(false)
  const label = name || email || ""
  const initial = (label[0] ?? "?").toUpperCase()

  const headerTrigger = (
    <Button variant="ghost" size="icon" aria-label={t("account")}>
      <UserRound size={18} />
    </Button>
  )
  const identity = (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        {image ? <AvatarImage src={image} alt="" /> : null}
        <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name || email}</span>
        {name && <span className="truncate text-xs text-muted-foreground">{email}</span>}
      </div>
    </>
  )

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "header" ? (
          headerTrigger
        ) : (
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            {identity}
            {/* Inside, so the accessible name keeps the visible name and
                    email plus the action — label-content-name-mismatch. */}
            <span className="sr-only">{t("open")}</span>
            <EllipsisVertical className="ml-auto size-4" />
          </SidebarMenuButton>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={
          variant === "header" ? "w-60 rounded-lg" : "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        }
        side={variant === "header" || isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5">{identity}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account">
              <UserRound />
              {tNav("account")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings />
              {tNav("settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/billing">
              <CreditCard />
              {tNav("billing")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setSignOutOpen(true)}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      {variant === "header" ? (
        menu
      ) : (
        <SidebarMenu>
          <SidebarMenuItem>{menu}</SidebarMenuItem>
        </SidebarMenu>
      )}
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}
