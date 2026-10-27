"use client"

import { useState, type AriaAttributes } from "react"
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

/**
 * A searchable list: the long-list half of `OptionSelect` (pick through that).
 * Filters in the browser, or, with `onSearchChange`, lets the caller search on
 * the server while it shows a spinner. Forwards `id` and ARIA attributes so it
 * works inside `FormControl`.
 */
type SearchableSelectProps = AriaAttributes & {
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
  id?: string
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
  id,
  ...aria
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
          {...aria}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-busy={loading || undefined}
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
                // Matched as typed and with "_" and "/" read as spaces, so "ho chi"
                // finds Asia/Ho_Chi_Minh.
                value={`${option.label} ${option.label.replace(/[_/]/g, " ")}`}
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
