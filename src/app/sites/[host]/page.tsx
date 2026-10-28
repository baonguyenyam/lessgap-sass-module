import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { db8 } from "@/lib/db8"
import { resolveHost } from "@/platform/tenancy/host"

/**
 * A tenant's public site (task 3.1). The proxy rewrites the tenant's hostname
 * to `/sites/[host]` — this page resolves it again to the tenant and renders
 * through the shared theme (task 3.5).
 */
export default async function SitePage() {
  const host = (await headers()).get("host") ?? ""
  const resolved = await resolveHost(host)
  if (resolved.kind !== "site") notFound()

  const tenant = await db8.orm.public.Tenant.where({ id: resolved.tenantId }).first()
  if (!tenant) notFound()
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold">{tenant.name}</h1>
    </main>
  )
}
