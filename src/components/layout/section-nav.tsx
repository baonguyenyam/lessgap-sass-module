"use client"

import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { cn } from "@/lib/utils"

export type SectionNavItem = {
  href: string
  label: string
  /** The route segment under the layout that renders the nav; null for its index page. */
  segment: string | null
}

/**
 * Vertical tabs for the sub-pages of one section (Settings, Admin settings).
 * A column beside the content from `md` up; on a phone, a row that scrolls,
 * because a column would push the page below the fold.
 *
 * Render it from the section's layout: the active page is read from the
 * layout's own segment, which a nested layout cannot get from a full path.
 */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  const segment = useSelectedLayoutSegment()

  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map((item) => {
          const active = item.segment === segment
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-[var(--radius)] px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The section layout: tabs in a column on the left, the page on the right. */
export function SectionLayout({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
      <aside className="md:sticky md:top-20 md:self-start">{nav}</aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  )
}
