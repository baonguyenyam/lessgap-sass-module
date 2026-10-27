import { cn } from "@/lib/utils"
import { TextareaHTMLAttributes, forwardRef } from "react"
import { fieldVariants } from "@/components/ui/field"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={ref}
          aria-invalid={error ? true : undefined}
          // Same look as every field; height is free, so the size's fixed height is dropped.
          className={cn(fieldVariants(), "h-auto min-h-24 py-2", className)}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
