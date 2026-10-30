"use client"

import { Check, CirclePlus, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type FacetOption = {
  value: string
  label: string
  /** Shown before the label, as the badge for that value shows it. */
  icon?: LucideIcon
  /** How many rows have this value, when the server counted them. */
  count?: number
}

/**
 * One facet of a list in the toolbar (shadcn-admin's faceted filter): a
 * dashed pill that opens a searchable list of the facet's values, each with
 * its icon and count. The chosen value shows in the pill; choosing it again,
 * or "Clear filter", removes it. One value per facet: the URL holds one.
 */
export function FacetFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: FacetOption[]
  value: string | undefined
  onChange: (value: string | null) => void
}) {
  const t = useTranslations("dataTable")
  const chosen = options.find((option) => option.value === value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-dashed">
          <CirclePlus />
          {label}
          {chosen && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {chosen.label}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={label} />
          <CommandList>
            <CommandEmpty>{t("noOptions")}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = option.value === value
                const Icon = option.icon
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => onChange(selected ? null : option.value)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border border-primary",
                        selected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    {Icon && <Icon className="text-muted-foreground" />}
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {chosen && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange(null)} className="justify-center text-center">
                    {t("clearFilter")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
