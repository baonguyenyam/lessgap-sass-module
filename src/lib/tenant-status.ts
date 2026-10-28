import type { FieldOutputTypes } from "@/generated/prisma8/contract.d"

/** `Tenant.status` values (spec/02-tenancy.md, "Tenant lifecycle"). */
export const TENANT_STATUSES = [
  "PROVISIONING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
] as const satisfies readonly FieldOutputTypes["public"]["Tenant"]["status"][]

export type TenantStatus = (typeof TENANT_STATUSES)[number]
