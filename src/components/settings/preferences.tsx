"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Languages, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { setAppLocale } from "@/app/actions/locale"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTheme, type Theme } from "@/hooks/use-theme"
import { languageName } from "@/i18n/language-name"

const OPTION =
  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors hover:bg-muted/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"

/** The same choice as the header's language switch, as a list. */
export function LanguagePreference({ locales }: { locales: readonly string[] }) {
  const current = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(locale: string) {
    startTransition(async () => {
      await setAppLocale(locale)
      router.refresh()
    })
  }

  return (
    <RadioGroup value={current} onValueChange={choose} disabled={pending} className="grid gap-2 sm:grid-cols-2">
      {locales.map((locale) => (
        <Label key={locale} htmlFor={`locale-${locale}`} lang={locale} className={OPTION}>
          <RadioGroupItem id={`locale-${locale}`} value={locale} />
          <Languages className="size-4 text-muted-foreground" />
          {languageName(locale)}
        </Label>
      ))}
    </RadioGroup>
  )
}

/** The same choice as the header's theme switch, as a list. */
export function ThemePreference() {
  const t = useTranslations("theme")
  const { theme, apply } = useTheme()
  const options: { value: Theme; label: string; icon: LucideIcon }[] = [
    { value: "light", label: t("light"), icon: Sun },
    { value: "dark", label: t("dark"), icon: Moon },
    { value: "system", label: t("system"), icon: Monitor },
  ]

  return (
    <RadioGroup
      value={theme ?? ""}
      onValueChange={(value) => apply(value as Theme)}
      className="grid gap-2 sm:grid-cols-3"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Label key={value} htmlFor={`theme-${value}`} className={OPTION}>
          <RadioGroupItem id={`theme-${value}`} value={value} />
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </Label>
      ))}
    </RadioGroup>
  )
}
