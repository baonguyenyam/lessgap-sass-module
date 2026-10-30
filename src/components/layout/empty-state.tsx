import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/**
 * Every empty block in the app (requirements: empty states are consistent):
 * the stock shadcn `Empty` as a block of its own (dashed border), with an icon,
 * a title, an optional sentence and an optional next step. Lists get it through
 * `DataTable`, in place of the table; anything else that can be empty renders
 * this, never a bare line of grey text.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /** `compact` for a narrow place, such as a board column or a short list inside a card. */
  size?: "default" | "compact"
  className?: string
}) {
  return (
    <Empty
      className={cn(
        "border border-border",
        size === "compact" ? "min-h-32 gap-3 p-4 md:p-6" : "min-h-64 md:p-12",
        className
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
