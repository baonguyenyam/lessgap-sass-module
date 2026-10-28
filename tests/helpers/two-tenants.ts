import type { Row } from "@/lib/db8"
import { createTenant } from "@tests/factories"

/** Two tenants with their owners, for isolation tests (T1–T3). */
export async function withTwoTenants(): Promise<{
  a: { tenant: Row<"Tenant">; owner: Row<"User"> }
  b: { tenant: Row<"Tenant">; owner: Row<"User"> }
}> {
  const a = await createTenant({ slug: `iso-a-${Date.now()}` })
  const b = await createTenant({ slug: `iso-b-${Date.now()}` })
  return { a, b }
}
