"use client"

import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ButtonHTMLAttributes, forwardRef } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]",
        gradient:
          "relative overflow-hidden text-primary-foreground shadow-soft [background-image:var(--gradient-brand)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-border bg-background/60 backdrop-blur-sm text-foreground hover:bg-accent hover:-translate-y-0.5",
        ghost: "bg-transparent hover:bg-accent text-foreground",
        destructive: "bg-destructive text-white hover:opacity-90 hover:-translate-y-0.5",
        "outline-primary":
          "border border-primary/40 bg-transparent text-primary hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-soft",
        "outline-destructive":
          "border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/5",
      },
      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4 text-sm",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-9 w-9",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, asChild, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={!asChild && (disabled || loading)}
        className={cn("group/btn", buttonVariants({ variant, size }), className)}
        {...props}
      >
        {asChild ? children : (
          <>
            {variant === "gradient" && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-white/25 transition-transform duration-700 ease-out group-hover/btn:translate-x-[220%]"
              />
            )}
            {loading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {children}
          </>
        )}
      </Comp>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
