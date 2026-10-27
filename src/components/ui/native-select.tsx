import { ChevronDown } from "lucide-react"
import { SelectHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"
import { fieldVariants, type FieldSize } from "@/components/ui/field"

interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: FieldSize
}

/**
 * A plain `<select>` styled like every other field, for forms rendered on the
 * server and posted to a server action. The browser's own arrow is hidden
 * (`appearance-none`) and replaced by a chevron with the same inset as the
 * Select component, so it never sits against the border.
 *
 * In a client component prefer `Select`, which can be searched and styled
 * item by item.
 */
const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, size, children, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(fieldVariants({ size }), "appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
