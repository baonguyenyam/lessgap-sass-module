import { CircleAlert, CircleCheck, CircleDashed, CircleX, Clock, TriangleAlert } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { StatusBadge, type StatusMap } from "@/components/data-table/status-badge"

const STATUSES: StatusMap<string> = {
  ACTIVE: { tone: "success", icon: CircleCheck },
  TRIALING: { tone: "info", icon: Clock },
  PAST_DUE: { tone: "warning", icon: TriangleAlert },
  CANCELED: { tone: "muted", icon: CircleX },
  UNPAID: { tone: "danger", icon: CircleAlert },
  INCOMPLETE: { tone: "neutral", icon: CircleDashed },
}

// Subscription statuses come from Stripe as stable codes; their labels live
// in the message files under `dashboard.billing.status`. Every page that shows
// a status renders this one, so the label and the colour of a status are the
// same wherever it appears. An unknown code is shown as it came.
export async function SubscriptionStatusBadge({ status }: { status: string }) {
  const t = await getTranslations("dashboard.billing")
  const known = status in STATUSES
  return (
    <StatusBadge {...(known ? STATUSES[status] : { tone: "neutral" as const })}>
      {known ? t(`status.${status}`) : status}
    </StatusBadge>
  )
}
