"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useRenderedPathname } from "@/hooks/use-rendered-pathname"
import { SETTINGS_PAGES } from "@/lib/settings-pages"
import { cn } from "@/lib/utils"

/** The settings sub-navigation: a row of tabs that scrolls on a narrow screen. */
export function SettingsNav() {
  const t = useTranslations("dashboard.settings.nav")
  const pathname = useRenderedPathname()

  return (
    <nav aria-label={t("label")} className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
      {SETTINGS_PAGES.map((page) => {
        const active = pathname === page.href
        return (
          <Link
            key={page.key}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t(page.key)}
          </Link>
        )
      })}
    </nav>
  )
}
