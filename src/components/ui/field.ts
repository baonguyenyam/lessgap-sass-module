import { cva, type VariantProps } from "class-variance-authority"

/**
 * The look and the size scale every form field shares: Input, Textarea,
 * NativeSelect and the Select trigger. One definition, so a select beside an
 * input in the same row is the same height and the same shade.
 *
 * Sizes match the Button scale: `sm` (36px) for toolbars and table filters,
 * `md` (40px) for forms, `lg` (48px, pill) on the auth pages. A button next to a field takes the same size name.
 */
export const fieldVariants = cva(
  "flex w-full rounded-[var(--radius)] border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
  {
    variants: {
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-3",
        // The pill fields of the sign-in and sign-up pages, beside a `lg` button.
        lg: "h-12 rounded-full px-4",
      },
    },
    defaultVariants: { size: "md" },
  }
)

export type FieldSize = NonNullable<VariantProps<typeof fieldVariants>["size"]>
