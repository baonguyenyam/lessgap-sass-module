"use client"

import { ViewTransition } from "react"
import { useTranslations } from "next-intl"
import { useLoadingBoundary } from "@/components/navigation-overlay"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * What every app page shows while it loads, from its `loading.tsx`: the stock
 * `Skeleton` in the shape of the page, so the layout does not jump when the
 * data arrives.
 *
 *   - `list`: a toolbar and the rows of a table;
 *   - `form`: labelled fields and a save button;
 *   - `cards`: a row of cards and a block below them.
 *
 * Inside a section layout (settings, account) pass `header={false}`: the
 * layout keeps its title and vertical tabs on screen.
 *
 * When the page arrives the skeleton fades out over it (a React view
 * transition, `.skeleton-reveal` in globals.css) instead of vanishing.
 */
export function PageSkeleton({ variant, header = true }: { variant: "list" | "form" | "cards"; header?: boolean }) {
  const t = useTranslations("loading")
  useLoadingBoundary()

  return (
    <ViewTransition exit="skeleton-reveal" default="none">
      <div role="status" aria-busy="true" aria-label={t("default")} className="space-y-6">
        {header && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        )}
        {variant === "list" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-full sm:w-72" />
              <Skeleton className="ml-auto hidden h-9 w-32 sm:block" />
            </div>
            <div className="space-y-px overflow-hidden rounded-[var(--radius)] border border-border">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="hidden h-4 w-24 sm:block" />
                  <Skeleton className="hidden h-4 w-24 sm:block" />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-48" />
            </div>
          </div>
        )}
        {variant === "form" && (
          <div className="space-y-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full max-w-md" />
              </div>
            ))}
            <Skeleton className="h-9 w-24" />
          </div>
        )}
        {variant === "cards" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        )}
      </div>
    </ViewTransition>
  )
}
