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
import { navGroups, type NavArea } from "@/components/layout/app-shell/nav"

/** Go to any page of the area by name: the header search, opened with Cmd/Ctrl+K (from Studio Admin). */
export function SearchDialog({
  area,
  showAdmin,
  slug,
  customRoles,
}: {
  area: NavArea
  showAdmin: boolean
  slug: string
  customRoles: boolean
}) {
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
      <Button
        variant="outline"
        aria-label={t("button")}
        className="size-8 justify-center px-0 text-muted-foreground sm:w-56 sm:justify-start sm:gap-2 sm:px-2"
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="hidden flex-1 text-left sm:inline">{t("button")}</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("title")} description={t("description")}>
        <Command>
          <CommandInput placeholder={t("placeholder")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            {navGroups(area, { showAdmin, slug, customRoles }).map((group) => (
              <CommandGroup key={group.key} heading={tNav(`groups.${group.key}`)}>
                {group.items.map((item) => {
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
