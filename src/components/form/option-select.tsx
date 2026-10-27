"use client"

import type { AriaAttributes } from "react"
import { SearchableSelect } from "@/components/form/searchable-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type Option = { value: string; label: string }

/** More options than this, and the list gets a search box. */
export const SEARCHABLE_FROM = 9

type OptionSelectProps = AriaAttributes & {
  value: string
  onValueChange: (value: string) => void
  options: Option[]
  disabled?: boolean
  /** The options are still loading: the field shows a spinner and cannot be opened. */
  loading?: boolean
  placeholder?: string
  className?: string
  id?: string
}

/**
 * The one way to pick from a list (requirements: long selects have search, a
 * field waiting for data shows a loading icon). Up to eight options it is the
 * stock Select; from nine on it is a searchable combobox (shadcn's Popover +
 * Command recipe, `SearchableSelect`). Use it instead of `Select` everywhere outside
 * `components/ui`; `tests/unit/ui-consistency.test.ts` checks.
 */
export function OptionSelect(props: OptionSelectProps) {
  return props.options.length >= SEARCHABLE_FROM ? <SearchableSelect {...props} /> : <PlainSelect {...props} />
}

function PlainSelect({
  value,
  onValueChange,
  options,
  disabled,
  loading,
  placeholder,
  className,
  id,
  ...aria
}: OptionSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger {...aria} id={id} aria-busy={loading || undefined} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
        {loading && <Spinner className="ml-auto" />}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
