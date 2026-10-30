"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { flatNavItems, navGroups, type NavAccess, type NavArea } from "@/components/layout/app-shell/nav"

/** Go to any page of the area by name: the header search, opened with Cmd/Ctrl+K (from Studio Admin). */
export function SearchDialog({ area, access }: { area: NavArea; access: NavAccess }) {
  const t = useTranslations("dashboard.search")
  const tNav = useTranslations("dashboard.nav")
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      {/* An icon like its neighbours (language, theme, account); the dialog
          opens on click or Cmd/Ctrl+K, which the tooltip shows. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("button")}
            aria-keyshortcuts="Meta+K Control+K"
            onClick={() => setOpen(true)}
          >
            <Search size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          {t("button")}
          <Kbd aria-hidden="true">⌘K</Kbd>
        </TooltipContent>
      </Tooltip>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("title")} description={t("description")}>
        <Command>
          <CommandInput placeholder={t("placeholder")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            {navGroups(area, access).map((group) => (
              <CommandGroup key={group.key} heading={tNav(`groups.${group.key}`)}>
                {flatNavItems([group]).map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.href}
                      value={`${tNav(item.key)} ${item.href}`}
                      onSelect={() => {
                        setOpen(false)
                        router.push(item.href)
                      }}
                    >
                      <Icon />
                      {tNav(item.key)}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
