import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/**
 * What an empty block says, by colour (owner, 2026-10-30): `neutral` is
 * "nothing here yet" (a light grey box), `danger` an error or failure,
 * `success` something done or in order, `info` a fact worth knowing,
 * `warning` something to fix before it bites. The same scale as StatusBadge.
 */
export type EmptyTone = "neutral" | "danger" | "success" | "info" | "warning"

const TONES: Record<EmptyTone, { box: string; media: string; title: string }> = {
  // A grey box with the icon on the page colour (white, or black in dark mode),
  // so the circle never blends into the box; no ring (owner, 2026-10-30).
  neutral: {
    box: "border-border bg-muted dark:bg-muted/40",
    media: "bg-background text-muted-foreground",
    title: "",
  },
  danger: {
    box: "border-destructive/30 bg-destructive/5 dark:bg-destructive/10",
    media: "bg-destructive/10 text-destructive",
    title: "text-destructive",
  },
  success: {
    box: "border-green-600/30 bg-green-500/5 dark:bg-green-500/10",
    media: "bg-green-500/10 text-green-700 dark:text-green-400",
    title: "text-green-800 dark:text-green-300",
  },
  info: {
    box: "border-sky-600/30 bg-sky-500/5 dark:bg-sky-500/10",
    media: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    title: "text-sky-800 dark:text-sky-300",
  },
  warning: {
    box: "border-amber-600/40 bg-amber-500/10 dark:bg-amber-500/10",
    media: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-300",
  },
}

/**
 * Every empty block in the app (requirements: empty states are consistent):
 * the stock shadcn `Empty` as a block of its own (dashed border), with an icon,
 * a title, a sentence and an optional next step, tinted by its `tone`. Lists
 * get it through `DataTable`, in place of the table; anything else that can
 * be empty renders this, never a bare line of grey text.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  size = "default",
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /** What the block says: nothing yet (default), an error, done, information, a warning. */
  tone?: EmptyTone
  /** `compact` for a narrow place, such as a board column or a short list inside a card. */
  size?: "default" | "compact"
  className?: string
}) {
  const colours = TONES[tone]
  return (
    <Empty
      data-tone={tone}
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "border",
        colours.box,
        size === "compact" ? "min-h-32 gap-3 p-4 md:p-6" : "min-h-64 md:p-12",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon" className={colours.media}>
          <Icon />
        </EmptyMedia>
        <EmptyTitle className={colours.title}>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
