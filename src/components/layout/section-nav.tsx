"use client"

import type { Route } from "next"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { cn } from "@/lib/utils"

export type SectionNavItem = {
  href: Route
  label: string
  /** The route segment under the layout that renders the nav; null for its index page. */
  segment: string | null
  /** An icon element (not a component: it crosses from the server layout). */
  icon?: React.ReactNode
  /** The heading this item sits under; consecutive items with the same one share it. */
  group?: string
}

/**
 * Vertical tabs for the sub-pages of one section (Account, Settings, Admin
 * settings), grouped under small uppercase headings with an icon per item and
 * the active page filled, as platform.madelab.io's profile does. A column
 * beside the content from `md` up; on a phone, one row that scrolls (the
 * headings hide there), because a column would push the page below the fold.
 *
 * Render it from the section's layout: the active page is read from the
 * layout's own segment, which a nested layout cannot get from a full path.
 */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  const segment = useSelectedLayoutSegment()
  const groups: { heading?: string; items: SectionNavItem[] }[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last && last.heading === item.group) last.items.push(item)
    else groups.push({ heading: item.group, items: [item] })
  }

  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
      <div className="flex gap-1 md:flex-col md:gap-0">
        {groups.map((group, index) => (
          <div
            key={group.heading ?? index}
            className={cn("flex gap-1 md:flex-col", index > 0 && "md:mt-3 md:border-t md:border-border md:pt-3")}
          >
            {group.heading && (
              <p className="hidden px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase md:block">
                {group.heading}
              </p>
            )}
            <ul className="flex gap-1 md:flex-col">
              {group.items.map((item) => {
                const active = item.segment === segment
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-[var(--radius)] px-3 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

/** The section layout: tabs in a column on the left, the page on the right. */
export function SectionLayout({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <aside className="md:sticky md:top-20 md:self-start">{nav}</aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  )
}
