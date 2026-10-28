"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import type { TenantStatus } from "@/lib/tenant-status"

const VARIANTS = {
  PROVISIONING: "outline",
  ACTIVE: "secondary",
  PAST_DUE: "default",
  SUSPENDED: "destructive",
  CANCELED: "destructive",
} as const satisfies Record<TenantStatus, React.ComponentProps<typeof Badge>["variant"]>

/** The tenant lifecycle state as a colour-coded badge (spec/02-tenancy.md). */
export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const t = useTranslations("platform.tenants.status")
  return <Badge variant={VARIANTS[status]}>{t(status)}</Badge>
}
