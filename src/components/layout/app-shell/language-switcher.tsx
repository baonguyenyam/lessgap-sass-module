"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Check, Languages } from "lucide-react"
import { setAppLocale } from "@/app/actions/locale"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { languageName } from "@/i18n/language-name"

/** Switches the language of the signed-in area, next to the theme switch. */
export function LanguageSwitcher({ locales }: { locales: readonly string[] }) {
  const t = useTranslations("language")
  const current = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (locales.length < 2) return null

  function choose(locale: string) {
    if (locale === current) return
    startTransition(async () => {
      await setAppLocale(locale)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("label")} disabled={pending}>
          {pending ? <Spinner /> : <Languages />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {locales.map((locale) => (
          <DropdownMenuItem key={locale} lang={locale} onClick={() => choose(locale)}>
            {languageName(locale)}
            {locale === current && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
