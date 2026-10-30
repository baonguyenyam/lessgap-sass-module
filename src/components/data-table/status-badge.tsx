import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/** The colour a status reads in: one scale for every status in the app. */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted"

const VARIANT = {
  neutral: "secondary",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
  muted: "outline",
} as const satisfies Record<StatusTone, React.ComponentProps<typeof Badge>["variant"]>

/** A domain's statuses: each value's tone and the icon that leads it. */
export type StatusMap<S extends string> = Record<S, { tone: StatusTone; icon?: LucideIcon }>

/**
 * Every status, kind or priority in the app draws through this badge
 * (.agents/rules/ui-accessibility.md, "Badges come from one component"): a
 * tone from one scale and, when the domain gives one, a leading icon, as
 * shadcn-admin's Status and Priority columns do. Feature code keeps a
 * `StatusMap` for its values and passes the translated label.
 */
export function StatusBadge({
  tone,
  icon: Icon,
  children,
}: {
  tone: StatusTone
  icon?: LucideIcon
  children: React.ReactNode
}) {
  return (
    <Badge variant={VARIANT[tone]}>
      {Icon && <Icon data-icon="inline-start" aria-hidden="true" />}
      {children}
    </Badge>
  )
}
