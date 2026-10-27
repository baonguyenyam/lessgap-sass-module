"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  onSearchChange?: (query: string) => void
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  onSearchChange,
  loading = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
}: SearchableSelectProps) {
  const t = useTranslations("ui.searchableSelect")
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selected = options.find((option) => option.value === value)

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery)
    onSearchChange?.(nextQuery)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder ?? t("placeholder")}
          </span>
          {loading ? <Spinner aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" className="opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-48 p-0" align="start">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            value={query}
            onValueChange={changeQuery}
            placeholder={searchPlaceholder ?? t("searchPlaceholder")}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status">
                <Spinner aria-hidden="true" />
                {t("loading")}
              </div>
            ) : (
              <CommandEmpty>{emptyMessage ?? t("empty")}</CommandEmpty>
            )}
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onValueChange(option.value)
                  setOpen(false)
                  changeQuery("")
                }}
              >
                {option.label}
                <Check className={cn("ml-auto", value === option.value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
