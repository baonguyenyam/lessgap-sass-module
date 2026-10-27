"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/logo"

/**
 * Brand loader for route transitions: the logo tile with an orbiting ring.
 * Used by the route-group `loading.tsx` files; drop it anywhere a section
 * of the app is waiting on data.
 */
const ARC_MASK = "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))"

export function BrandLoader({
  label,
  className,
  ring = true,
}: {
  label?: string
  className?: string
  /** The orbiting ring around the tile. Off, only the logo head turns. */
  ring?: boolean
}) {
  const t = useTranslations("loading")
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex min-h-[50vh] flex-col items-center justify-center gap-5", className)}
    >
      <div className="relative h-[72px] w-[72px]">
        {ring && (
          <>
            {/* faint full track */}
            <span aria-hidden="true" className="absolute inset-0 rounded-full border-[3px] border-primary/10" />
            {/* brand-gradient arc with a fading tail — the moving part */}
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-spin rounded-full will-change-transform"
              style={{
                background: "conic-gradient(from 0deg, transparent 50%, var(--primary-2) 82%, var(--primary) 100%)",
                mask: ARC_MASK,
                WebkitMask: ARC_MASK,
                animationDuration: "800ms",
              }}
            />
          </>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          {/* The head turns too, faster than in the header (a turn every 1.6s
              instead of 8s): a wait lasts a second, and at the header's pace
              it would barely move. */}
          <LogoMark
            animated
            className="h-11 w-11 rounded-2xl ring-1 ring-primary/15"
            iconClassName="h-6 w-6 [animation-duration:1.6s]"
          />
        </span>
      </div>
      {/* One announcement, not two: with a visible label the sr-only copy
          repeated it to a screen reader. */}
      {label ? (
        <p className="animate-pulse text-sm font-medium text-muted-foreground">{label}</p>
      ) : (
        <span className="sr-only">{t("default")}</span>
      )}
    </div>
  )
}
