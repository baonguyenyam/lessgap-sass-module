"use client"

import { Ban, CircleCheck, CircleX, Hourglass, TriangleAlert } from "lucide-react"
import { useTranslations } from "next-intl"
import { StatusBadge, type StatusMap } from "@/components/data-table/status-badge"
import type { TenantStatus } from "@/lib/tenant-status"

const STATUSES: StatusMap<TenantStatus> = {
  PROVISIONING: { tone: "info", icon: Hourglass },
  ACTIVE: { tone: "success", icon: CircleCheck },
  PAST_DUE: { tone: "warning", icon: TriangleAlert },
  SUSPENDED: { tone: "danger", icon: Ban },
  CANCELED: { tone: "muted", icon: CircleX },
}

/** The tenant lifecycle state as a colour-coded badge (spec/02-tenancy.md). */
export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const t = useTranslations("platform.tenants.status")
  return <StatusBadge {...STATUSES[status]}>{t(status)}</StatusBadge>
}
