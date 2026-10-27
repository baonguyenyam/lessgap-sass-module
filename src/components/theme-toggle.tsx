"use client"

import { useTranslations } from "next-intl"
import { Sun, Moon, Monitor, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useTheme, type Theme } from "@/hooks/use-theme"

const options: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
]

export function ThemeToggle() {
  const t = useTranslations("theme")
  // Spelled out rather than `t(value)`: a key built from a variable cannot be
  // matched against the message file, and the check that catches a renamed or
  // orphaned key stops covering this namespace the moment one appears.
  const labels: Record<Theme, string> = {
    light: t("light"),
    dark: t("dark"),
    system: t("system"),
  }
  const { theme, apply, isDark } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("label")}>
          {theme === null ? null : isDark ? <Moon size={18} /> : <Sun size={18} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {options.map(({ value, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => apply(value)}>
            <Icon />
            {labels[value]}
            {theme === value && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
