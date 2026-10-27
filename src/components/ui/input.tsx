import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"
import { fieldVariants, type FieldSize } from "@/components/ui/field"

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  error?: string
  /** `sm` in toolbars and filters, `md` (default) in forms. */
  size?: FieldSize
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, size, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(fieldVariants({ size }), "py-2", className)}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
